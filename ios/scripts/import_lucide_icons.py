#!/usr/bin/env python3
"""Compile Lucide SVGs into native SwiftUI paths. No runtime SVG parser."""
import hashlib
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET
from svgpathtools import Document, Line, CubicBezier, QuadraticBezier, Arc

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'ThirdParty' / 'Lucide'
DESTINATION = ROOT / 'Sources' / 'Evolingo' / 'CodexCatalog.swift'


def number(value):
    text = f'{float(value):.6f}'.rstrip('0').rstrip('.')
    return '0' if text in ('', '-0') else text


def point(value):
    return f'.init(x: {number(value.real)}, y: {number(value.imag)})'


def commands(path):
    lines = []
    for subpath in path.continuous_subpaths():
        if not len(subpath):
            continue
        lines.append(f'p.move(to: {point(subpath.start)})')
        for segment in subpath:
            if isinstance(segment, Line):
                lines.append(f'p.addLine(to: {point(segment.end)})')
            elif isinstance(segment, CubicBezier):
                lines.append(f'p.addCurve(to: {point(segment.end)}, control1: {point(segment.control1)}, control2: {point(segment.control2)})')
            elif isinstance(segment, QuadraticBezier):
                lines.append(f'p.addQuadCurve(to: {point(segment.end)}, control: {point(segment.control)})')
            elif isinstance(segment, Arc):
                count = max(1, math.ceil(abs(segment.delta) / 45))
                cubics = list(segment.as_cubic_curves(curves=count))
                assert abs(cubics[0].start - segment.start) < 1e-6
                assert abs(cubics[-1].end - segment.end) < 1e-6
                for cubic in cubics:
                    lines.append(f'p.addCurve(to: {point(cubic.end)}, control1: {point(cubic.control1)}, control2: {point(cubic.control2)})')
            else:
                raise ValueError(f'Unsupported SVG segment {type(segment)}')
        if subpath.isclosed():
            lines.append('p.closeSubpath()')
    return lines


def main():
    manifest = json.loads((SOURCE / 'manifest.json').read_text())
    svg_dir = SOURCE / 'svg'
    svg_files = sorted(list(svg_dir.glob('*.svg')))

    output = [
        f'// Generated from Lucide Icons {manifest["version"]}; ISC License.',
        '// Compiled directly into native SwiftUI paths. No runtime SVG parser.',
        'import SwiftUI', '',
        '@MainActor enum CodexCatalog {',
        '    static let aliases: [String: String] = ['
    ]

    for symbol, name in sorted(manifest['symbols'].items()):
        output.append(f'        {json.dumps(symbol)}: {json.dumps(name)},')
    output += ['    ]', '', '    static func layers(for name: String) -> [CodexVectorLayer]? {',
               '        switch name {']

    layer_count = 0
    for svg_path in svg_files:
        icon_name = svg_path.stem
        document = Document(str(svg_path))
        paths = document.paths()
        attributes = [path.element.attrib for path in paths]
        root_attrib = document.tree.getroot().attrib

        visible = []
        for path in paths:
            if len(path):
                visible.append(path)

        if not visible:
            continue

        boxes = [p.bbox() for p in visible]
        x0 = min(b[0] for b in boxes)
        x1 = max(b[1] for b in boxes)
        y0 = min(b[2] for b in boxes)
        y1 = max(b[3] for b in boxes)
        center = complex((x0 + x1) / 2, (y0 + y1) / 2)
        span = max(x1 - x0, y1 - y0)
        factor = 20 / span if span > 0 else 1

        output.append(f'        case {json.dumps(icon_name)}:')
        output.append('            return [')

        used = 0
        for path, attrs in zip(paths, attributes):
            if not len(path):
                continue
            fill = attrs.get('fill', root_attrib.get('fill', 'none')) != 'none'
            stroke = attrs.get('stroke', root_attrib.get('stroke', 'currentColor')) != 'none'
            even_odd = attrs.get('fill-rule', root_attrib.get('fill-rule', 'nonzero')) == 'evenodd'
            normalized = path.translated(-center).scaled(factor).translated(12 + 12j)

            for painted_fill in ([True] if fill else []) + ([False] if stroke else []):
                output.append('                CodexVectorLayer(path: Path { p in')
                output += ['                    ' + cmd for cmd in commands(normalized)]
                output.append(f'                }}, filled: {str(painted_fill).lower()}, evenOdd: {str(even_odd).lower()}),')
                used += 1

        layer_count += used
        output.append('            ]')

    output += [
        '        default: return nil',
        '        }',
        '    }',
        '',
        '    static let licenseText = "Lucide Icons - ISC License"',
        '}'
    ]

    DESTINATION.write_text('\n'.join(output) + '\n')
    print(f'Compiled {len(svg_files)} Lucide SVGs / {layer_count} vector layers / {len(manifest["symbols"])} aliases.')


if __name__ == '__main__':
    main()
