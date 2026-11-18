/**
 * Shared E2E Test Assertion & Inspection Harness
 * 
 * Provides opaque-box assertions, AST-lite regex inspection for Swift and TypeScript/JavaScript sources,
 * Plist configuration parser, touch-target verification, layout geometry checkers, database index verifiers,
 * and an isolated asynchronous test runner with structured result reporting.
 * 
 * Uses ONLY Node.js built-ins: fs, path, assert, child_process.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.env.EVOLINGO_ROOT || '/root/evolingo';

// ============================================================================
// ANSI Styling Helpers
// ============================================================================
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
};

// ============================================================================
// Core Assertion Utilities
// ============================================================================
function assertTrue(value, message) {
  if (!value) {
    throw new assert.AssertionError({
      message: message || `Expected truthy value, got ${value}`,
      actual: value,
      expected: true,
      operator: 'assertTrue'
    });
  }
}

function assertFalse(value, message) {
  if (value) {
    throw new assert.AssertionError({
      message: message || `Expected falsy value, got ${value}`,
      actual: value,
      expected: false,
      operator: 'assertFalse'
    });
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new assert.AssertionError({
      message: message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      actual,
      expected,
      operator: 'assertEqual'
    });
  }
}

function assertNotEqual(actual, unexpected, message) {
  if (actual === unexpected) {
    throw new assert.AssertionError({
      message: message || `Expected value not to equal ${JSON.stringify(unexpected)}`,
      actual,
      expected: `not ${JSON.stringify(unexpected)}`,
      operator: 'assertNotEqual'
    });
  }
}

function assertMatch(text, pattern, message) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  if (!regex.test(text)) {
    throw new assert.AssertionError({
      message: message || `Expected text to match pattern ${regex}`,
      actual: typeof text === 'string' ? text.slice(0, 300) : text,
      expected: regex.toString(),
      operator: 'assertMatch'
    });
  }
}

function assertNotMatch(text, pattern, message) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  if (regex.test(text)) {
    throw new assert.AssertionError({
      message: message || `Expected text NOT to match pattern ${regex}`,
      actual: typeof text === 'string' ? text.slice(0, 300) : text,
      expected: `NOT ${regex.toString()}`,
      operator: 'assertNotMatch'
    });
  }
}

function assertIncludes(collection, element, message) {
  if (typeof collection === 'string') {
    if (!collection.includes(element)) {
      throw new assert.AssertionError({
        message: message || `Expected string to contain "${element}"`,
        actual: collection.slice(0, 300),
        expected: element,
        operator: 'assertIncludes'
      });
    }
  } else if (Array.isArray(collection)) {
    if (!collection.includes(element)) {
      throw new assert.AssertionError({
        message: message || `Expected array to contain element`,
        actual: collection,
        expected: element,
        operator: 'assertIncludes'
      });
    }
  } else if (collection && typeof collection === 'object') {
    if (!(element in collection)) {
      throw new assert.AssertionError({
        message: message || `Expected object to contain key "${element}"`,
        actual: Object.keys(collection),
        expected: element,
        operator: 'assertIncludes'
      });
    }
  } else {
    throw new Error(`assertIncludes target is neither string, array, nor object: ${collection}`);
  }
}

function assertNotIncludes(collection, element, message) {
  if (typeof collection === 'string') {
    if (collection.includes(element)) {
      throw new assert.AssertionError({
        message: message || `Expected string NOT to contain "${element}"`,
        actual: collection.slice(0, 300),
        expected: `not contain ${element}`,
        operator: 'assertNotIncludes'
      });
    }
  } else if (Array.isArray(collection)) {
    if (collection.includes(element)) {
      throw new assert.AssertionError({
        message: message || `Expected array NOT to contain element`,
        actual: collection,
        expected: `not contain ${element}`,
        operator: 'assertNotIncludes'
      });
    }
  } else if (collection && typeof collection === 'object') {
    if (element in collection) {
      throw new assert.AssertionError({
        message: message || `Expected object NOT to contain key "${element}"`,
        actual: Object.keys(collection),
        expected: `not contain ${element}`,
        operator: 'assertNotIncludes'
      });
    }
  }
}

function assertGreaterThanOrEqual(actual, min, message) {
  if (typeof actual !== 'number' || actual < min) {
    throw new assert.AssertionError({
      message: message || `Expected ${actual} >= ${min}`,
      actual,
      expected: `>= ${min}`,
      operator: 'assertGreaterThanOrEqual'
    });
  }
}

function assertLessThanOrEqual(actual, max, message) {
  if (typeof actual !== 'number' || actual > max) {
    throw new assert.AssertionError({
      message: message || `Expected ${actual} <= ${max}`,
      actual,
      expected: `<= ${max}`,
      operator: 'assertLessThanOrEqual'
    });
  }
}

function assertInRange(actual, min, max, message) {
  if (typeof actual !== 'number' || actual < min || actual > max) {
    throw new assert.AssertionError({
      message: message || `Expected ${actual} to be in range [${min}, ${max}]`,
      actual,
      expected: `[${min}, ${max}]`,
      operator: 'assertInRange'
    });
  }
}

function assertThrows(fn, expectedRegex, message) {
  let threw = false;
  let thrownError = null;
  try {
    fn();
  } catch (err) {
    threw = true;
    thrownError = err;
  }
  if (!threw) {
    throw new assert.AssertionError({
      message: message || `Expected function to throw, but it succeeded`,
      operator: 'assertThrows'
    });
  }
  if (expectedRegex) {
    const regex = typeof expectedRegex === 'string' ? new RegExp(expectedRegex) : expectedRegex;
    if (!regex.test(String(thrownError && thrownError.message ? thrownError.message : thrownError))) {
      throw new assert.AssertionError({
        message: message || `Threw error but did not match ${regex}: ${thrownError.message}`,
        actual: thrownError.message,
        expected: regex.toString(),
        operator: 'assertThrows'
      });
    }
  }
}

async function assertAsyncThrows(asyncFn, expectedRegex, message) {
  let threw = false;
  let thrownError = null;
  try {
    await asyncFn();
  } catch (err) {
    threw = true;
    thrownError = err;
  }
  if (!threw) {
    throw new assert.AssertionError({
      message: message || `Expected async function to throw, but it succeeded`,
      operator: 'assertAsyncThrows'
    });
  }
  if (expectedRegex) {
    const regex = typeof expectedRegex === 'string' ? new RegExp(expectedRegex) : expectedRegex;
    if (!regex.test(String(thrownError && thrownError.message ? thrownError.message : thrownError))) {
      throw new assert.AssertionError({
        message: message || `Async threw error but did not match ${regex}: ${thrownError.message}`,
        actual: thrownError.message,
        expected: regex.toString(),
        operator: 'assertAsyncThrows'
      });
    }
  }
}

// ============================================================================
// File & Path Inspection Helpers
// ============================================================================
function resolvePath(...segments) {
  if (segments.length === 1 && path.isAbsolute(segments[0])) {
    return segments[0];
  }
  return path.resolve(PROJECT_ROOT, ...segments);
}

function fileExists(relOrAbsPath) {
  const p = resolvePath(relOrAbsPath);
  return fs.existsSync(p);
}

function readFile(relOrAbsPath) {
  const p = resolvePath(relOrAbsPath);
  if (!fs.existsSync(p)) {
    throw new Error(`File does not exist: ${p}`);
  }
  return fs.readFileSync(p, 'utf8');
}

function readJson(relOrAbsPath) {
  const content = readFile(relOrAbsPath);
  return JSON.parse(content);
}

function findFiles(dir, filterRegex) {
  const absDir = resolvePath(dir);
  if (!fs.existsSync(absDir)) return [];
  const results = [];
  function scan(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== '.build' && ent.name !== '.git') {
          scan(full);
        }
      } else if (ent.isFile()) {
        if (!filterRegex || (filterRegex instanceof RegExp ? filterRegex.test(ent.name) : ent.name.includes(filterRegex))) {
          results.push(full);
        }
      }
    }
  }
  scan(absDir);
  return results;
}

/**
 * Robust Plist Parser (supports XML format plist dictionaries)
 */
function readPlist(relOrAbsPath) {
  const xml = readFile(relOrAbsPath);
  const result = {};
  
  // Extract key-value pairs
  const keyValRegex = /<key>([^<]+)<\/key>\s*(?:<string>([^<]*)<\/string>|<(true|false)\/>|<integer>(\d+)<\/integer>|<real>([\d.]+)<\/real>|<array>([\s\S]*?)<\/array>|<dict>([\s\S]*?)<\/dict>)?/g;
  let match;
  while ((match = keyValRegex.exec(xml)) !== null) {
    const key = match[1];
    if (match[2] !== undefined) {
      result[key] = match[2];
    } else if (match[3] !== undefined) {
      result[key] = match[3] === 'true';
    } else if (match[4] !== undefined) {
      result[key] = parseInt(match[4], 10);
    } else if (match[5] !== undefined) {
      result[key] = parseFloat(match[5]);
    } else if (match[6] !== undefined) {
      // array of strings
      const arr = [];
      const itemRegex = /<string>([^<]*)<\/string>/g;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(match[6])) !== null) {
        arr.push(itemMatch[1]);
      }
      result[key] = arr;
    } else if (match[7] !== undefined) {
      result[key] = match[7].trim();
    } else {
      result[key] = null;
    }
  }
  return result;
}

// ============================================================================
// Swift AST-Lite & Code Inspection Helpers
// ============================================================================
class SwiftInspector {
  constructor(filePath) {
    this.filePath = resolvePath(filePath);
    this.source = fs.existsSync(this.filePath) ? fs.readFileSync(this.filePath, 'utf8') : '';
    this.exists = fs.existsSync(this.filePath);
  }

  hasSymbol(name) {
    if (!this.exists) return false;
    const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`);
    return regex.test(this.source);
  }

  hasPattern(pattern) {
    if (!this.exists) return false;
    const regex = typeof pattern === 'string' ? new RegExp(escapeRegExp(pattern)) : pattern;
    return regex.test(this.source);
  }

  getLinesMatching(pattern) {
    if (!this.exists) return [];
    const regex = typeof pattern === 'string' ? new RegExp(escapeRegExp(pattern)) : pattern;
    const lines = this.source.split('\n');
    const matched = [];
    lines.forEach((line, idx) => {
      if (regex.test(line)) {
        matched.push({ line: idx + 1, content: line.trim() });
      }
    });
    return matched;
  }

  extractEnum(enumName) {
    if (!this.exists) return null;
    const regex = new RegExp(`(?:enum|indirect\\s+enum)\\s+${escapeRegExp(enumName)}[^{]*\\{([\\s\\S]*?)(?:\\n\\s*\\}|\\Z)`, 'm');
    const match = this.source.match(regex);
    return match ? match[1] : null;
  }

  getEnumCases(enumName) {
    const enumBody = this.extractEnum(enumName);
    if (!enumBody) return [];
    const cases = [];
    const caseLineRegex = /^\s*case\s+([^/\n]+)/gm;
    let match;
    while ((match = caseLineRegex.exec(enumBody)) !== null) {
      const identifiers = match[1].split(',').map(s => s.trim().split(/[\s(]/)[0]).filter(Boolean);
      cases.push(...identifiers);
    }
    return cases;
  }

  hasEnumCase(enumName, caseName) {
    const cases = this.getEnumCases(enumName);
    return cases.includes(caseName);
  }

  extractStruct(structName) {
    if (!this.exists) return null;
    const regex = new RegExp(`struct\\s+${escapeRegExp(structName)}[^{]*\\{([\\s\\S]*?)(?:\\n\\s*\\}|\\Z)`, 'm');
    const match = this.source.match(regex);
    return match ? match[1] : null;
  }

  extractClass(className) {
    if (!this.exists) return null;
    const regex = new RegExp(`(?:final\\s+)?class\\s+${escapeRegExp(className)}[^{]*\\{([\\s\\S]*?)(?:\\n\\s*\\}|\\Z)`, 'm');
    const match = this.source.match(regex);
    return match ? match[1] : null;
  }

  hasMethod(methodName, containerName) {
    let scope = this.source;
    if (containerName) {
      scope = this.extractClass(containerName) || this.extractStruct(containerName) || '';
    }
    const regex = new RegExp(`func\\s+${escapeRegExp(methodName)}\\s*\\(`);
    return regex.test(scope);
  }

  checkTouchTargetEnforcement(viewSnippetOrName) {
    if (!this.exists) return { compliant: false, reason: 'File does not exist' };
    const content = this.source;
    
    // Check if the snippet contains explicit >= 44 frame or contentShape
    const hasFrame44 = /\.frame\s*\([^)]*(?:width:\s*(?:[4-9]\d|\d{3,})|minWidth:\s*(?:4[4-9]|[5-9]\d|\d{3,})|height:\s*(?:4[4-9]|[5-9]\d|\d{3,})|minHeight:\s*(?:4[4-9]|[5-9]\d|\d{3,}))/s.test(content);
    const hasContentShape = /\.contentShape\s*\(\s*(?:Rectangle\(\)|RoundedRectangle\([^)]+\)|Capsule\(\)|Circle\(\))\s*\)/s.test(content);
    const hasTouchExpansion = /point\s*\(\s*inside\s*:[^)]*with:\s*UIEvent/s.test(content) || /UIEdgeInsets\s*\(\s*top:\s*-[0-9]+/s.test(content);

    return {
      compliant: hasFrame44 || hasContentShape || hasTouchExpansion,
      hasFrame44,
      hasContentShape,
      hasTouchExpansion
    };
  }

  checkKeyboardNotification() {
    if (!this.exists) return false;
    return /keyboardWill(?:ChangeFrame|Show|Hide)Notification/i.test(this.source);
  }

  checkSafeAreaInsetBottom() {
    if (!this.exists) return false;
    return /\.safeAreaInset\s*\(\s*edge:\s*\.bottom/s.test(this.source);
  }

  checkProMotionDisplayLink() {
    if (!this.exists) return false;
    return /CAFrameRateRange\s*\(\s*minimum:\s*\d+,\s*maximum:\s*120,\s*preferred:\s*120\s*\)/s.test(this.source) ||
           /preferredFrameRateRange/s.test(this.source) ||
           /CADisableMinimumFrameDurationOnPhone/s.test(this.source);
  }

  checkZIndexOrder() {
    if (!this.exists) return false;
    return /\.zIndex\s*\(\s*[\d.]+\s*\)/s.test(this.source);
  }
}

function inspectSwift(relPath) {
  return new SwiftInspector(relPath);
}

// ============================================================================
// TypeScript & API Route Inspection Helpers
// ============================================================================
class TsInspector {
  constructor(filePath) {
    this.filePath = resolvePath(filePath);
    this.source = fs.existsSync(this.filePath) ? fs.readFileSync(this.filePath, 'utf8') : '';
    this.exists = fs.existsSync(this.filePath);
  }

  hasExport(identifier) {
    if (!this.exists) return false;
    const regex = new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|var|class|type|interface)\\s+${escapeRegExp(identifier)}\\b`);
    return regex.test(this.source);
  }

  hasPattern(pattern) {
    if (!this.exists) return false;
    const regex = typeof pattern === 'string' ? new RegExp(escapeRegExp(pattern)) : pattern;
    return regex.test(this.source);
  }

  getLinesMatching(pattern) {
    if (!this.exists) return [];
    const regex = typeof pattern === 'string' ? new RegExp(escapeRegExp(pattern)) : pattern;
    const lines = this.source.split('\n');
    const matched = [];
    lines.forEach((line, idx) => {
      if (regex.test(line)) {
        matched.push({ line: idx + 1, content: line.trim() });
      }
    });
    return matched;
  }

  hasImport(modulePath, importedIdentifier) {
    if (!this.exists) return false;
    if (importedIdentifier) {
      const regex = new RegExp(`import\\s+(?:\\*\\s+as\\s+\\w+|\\{[^}]*\\b${escapeRegExp(importedIdentifier)}\\b[^}]*\\}|\\w+)\\s+from\\s+['"]${escapeRegExp(modulePath)}['"]`);
      return regex.test(this.source);
    }
    const regex = new RegExp(`from\\s+['"]${escapeRegExp(modulePath)}['"]`);
    return regex.test(this.source);
  }

  usesPromiseAllSettled(functionName) {
    if (!this.exists) return false;
    let scope = this.source;
    if (functionName) {
      const fnRegex = new RegExp(`(?:async\\s+function\\s+${escapeRegExp(functionName)}|const\\s+${escapeRegExp(functionName)}\\s*=\\s*async)[\\s\\S]*?(?:\\nexport|\\n\\w|\\Z)`, 'm');
      const match = this.source.match(fnRegex);
      if (match) scope = match[0];
    }
    return /Promise\.allSettled\s*\(/.test(scope);
  }

  hasDatabaseIndex(collectionOrIndexName) {
    if (!this.exists) return false;
    const regex = new RegExp(`(?:createIndex|ensureIndex|indexes:[^;]+|db\\.[a-zA-Z0-9_]+\\.createIndex)[\\s\\S]*?${escapeRegExp(collectionOrIndexName)}`, 'i');
    return regex.test(this.source);
  }

  hasCompoundDatabaseIndex(field1, field2) {
    if (!this.exists) return false;
    const pattern = new RegExp(`(?:createIndex|indexes:[^;]+)[\\s\\S]*?${escapeRegExp(field1)}[\\s\\S]*?${escapeRegExp(field2)}`, 'i');
    return pattern.test(this.source);
  }

  hasQueryProjection() {
    if (!this.exists) return false;
    return /projection\s*:\s*\{/i.test(this.source) || /\.select\s*\(/i.test(this.source) || /project\s*:\s*\{/i.test(this.source);
  }
}

function inspectTs(relPath) {
  return new TsInspector(relPath);
}

// ============================================================================
// Release & Artifact Inspection Helpers
// ============================================================================
function inspectIpaArchive(ipaPath) {
  const absPath = resolvePath(ipaPath);
  if (!fs.existsSync(absPath)) {
    return { exists: false, error: 'File does not exist' };
  }
  const stat = fs.statSync(absPath);
  let isValidZip = false;
  let fileList = [];
  try {
    const output = execSync(`unzip -l "${absPath}" 2>/dev/null`, { encoding: 'utf8' });
    isValidZip = true;
    fileList = output.split('\n').filter(Boolean);
  } catch (err) {
    isValidZip = false;
  }

  const hasAppPayload = fileList.some(line => line.includes('Payload/') && line.includes('.app'));
  const hasInfoPlist = fileList.some(line => line.includes('Info.plist'));

  return {
    exists: true,
    sizeBytes: stat.size,
    mode: stat.mode,
    isValidZip,
    hasAppPayload,
    hasInfoPlist,
    fileCount: fileList.length
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Structured Test Runner (TestSuite)
// ============================================================================
class TestSuite {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.features = new Map(); // featureId -> { id, title, tests: [] }
    this.currentFeature = null;
    this.results = [];
  }

  feature(id, title, defineFn) {
    const featObj = { id, title, tests: [] };
    this.features.set(id, featObj);
    this.currentFeature = featObj;
    defineFn({
      test: (testName, testFn) => {
        featObj.tests.push({
          id: `${id}.${featObj.tests.length + 1}`,
          featureId: id,
          featureTitle: title,
          name: testName,
          fn: testFn
        });
      }
    });
    this.currentFeature = null;
  }

  async run(options = {}) {
    const { filter, bail = false, silent = false } = options;
    console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}  Running Test Suite: ${this.suiteName}${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════${colors.reset}\n`);

    const startTime = Date.now();
    let totalCount = 0;
    let passedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    this.results = [];

    for (const [featId, feat] of this.features.entries()) {
      let printedFeatureHeader = false;

      for (const t of feat.tests) {
        if (filter && !t.name.toLowerCase().includes(filter.toLowerCase()) && !String(featId).includes(filter)) {
          skippedCount++;
          continue;
        }

        if (!printedFeatureHeader && !silent) {
          console.log(`\n${colors.bold}${colors.blue}Feature ${feat.id}: ${feat.title}${colors.reset}`);
          printedFeatureHeader = true;
        }

        totalCount++;
        const testStart = Date.now();
        let status = 'PASS';
        let errorDetails = null;

        try {
          await t.fn();
        } catch (err) {
          status = 'FAIL';
          errorDetails = {
            message: err.message,
            actual: err.actual,
            expected: err.expected,
            operator: err.operator,
            stack: err.stack ? err.stack.split('\n').slice(0, 4).join('\n') : ''
          };
          failedCount++;
        }

        const duration = Date.now() - testStart;
        if (status === 'PASS') {
          passedCount++;
          if (!silent) {
            console.log(`  ${colors.green}✔ [${t.id}] ${t.name}${colors.reset} ${colors.dim}(${duration}ms)${colors.reset}`);
          }
        } else {
          if (!silent) {
            console.log(`  ${colors.red}✖ [${t.id}] ${t.name}${colors.reset} ${colors.dim}(${duration}ms)${colors.reset}`);
            console.log(`    ${colors.red}Reason: ${errorDetails.message}${colors.reset}`);
            if (errorDetails.expected !== undefined) {
              console.log(`    ${colors.yellow}Expected: ${JSON.stringify(errorDetails.expected)}${colors.reset}`);
              console.log(`    ${colors.yellow}Actual:   ${JSON.stringify(errorDetails.actual)}${colors.reset}`);
            }
          }
        }

        this.results.push({
          id: t.id,
          featureId: t.featureId,
          featureTitle: t.featureTitle,
          name: t.name,
          status,
          durationMs: duration,
          error: errorDetails
        });

        if (bail && status === 'FAIL') {
          console.log(`\n${colors.bgRed}${colors.white} Bailing early due to failure ${colors.reset}\n`);
          break;
        }
      }
      if (bail && failedCount > 0) break;
    }

    const totalDuration = Date.now() - startTime;
    const summary = {
      total: totalCount,
      passed: passedCount,
      failed: failedCount,
      skipped: skippedCount,
      durationMs: totalDuration,
      passRate: totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(1) + '%' : '0%'
    };

    console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}Test Summary:${colors.reset}`);
    console.log(`  Total:   ${totalCount}`);
    console.log(`  Passed:  ${colors.green}${passedCount}${colors.reset}`);
    console.log(`  Failed:  ${failedCount > 0 ? colors.red : colors.dim}${failedCount}${colors.reset}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log(`  Pass Rate: ${summary.passRate}`);
    console.log(`  Duration:  ${totalDuration}ms`);
    console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════${colors.reset}\n`);

    return {
      suiteName: this.suiteName,
      summary,
      results: this.results
    };
  }

  exportResults() {
    return {
      suiteName: this.suiteName,
      features: Array.from(this.features.values()).map(f => ({
        id: f.id,
        title: f.title,
        testCount: f.tests.length
      })),
      results: this.results
    };
  }
}

module.exports = {
  PROJECT_ROOT,
  // Assertions
  assert,
  assertTrue,
  assertFalse,
  assertEqual,
  assertNotEqual,
  assertMatch,
  assertNotMatch,
  assertIncludes,
  assertNotIncludes,
  assertGreaterThanOrEqual,
  assertLessThanOrEqual,
  assertInRange,
  assertThrows,
  assertAsyncThrows,
  // File operations
  resolvePath,
  fileExists,
  readFile,
  readJson,
  findFiles,
  readPlist,
  // AST / Code inspectors
  SwiftInspector,
  inspectSwift,
  TsInspector,
  inspectTs,
  inspectIpaArchive,
  // Runner
  TestSuite,
  colors
};
