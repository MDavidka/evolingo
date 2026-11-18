import SwiftUI

struct ModernScheduleView: View {
    @StateObject private var model = ScheduleModel()
    let onOpenSidebar: () -> Void
    let onOpenProfile: () -> Void
    @State private var filter: TaskState = .active
    @State private var creating = false
    @State private var deleting: NativeTask?

    var body: some View {
        VStack(spacing: 0) {
            EvoSharedTopBar(onOpenSidebar: onOpenSidebar, onOpenProfile: onOpenProfile) {
                Picker("Show schedules", selection: $filter) {
                    Text("Active").tag(TaskState.active)
                    Text("Paused").tag(TaskState.paused)
                    Text("Completed").tag(TaskState.completed)
                }
            }

            ScrollView {
                LazyVStack(spacing: 12) {
                    Button {
                        EvoHaptics.tap()
                        creating = true
                    } label: {
                        EvoSymbolLabel("New schedule", systemImage: "plus")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(EvoButtonStyle())
                    .disabled(model.isRestoring || model.storageUnavailable)
                    .padding(.bottom, 32)

                    if let notice = model.notice {
                        EvoSymbolLabel(notice, systemImage: "info.circle")
                            .font(EvoFont.text(.footnote))
                            .foregroundStyle(EvoTheme.Palette.secondary)
                    }

                    let visibleTasks = model.tasks.filter { $0.state == filter }
                    if visibleTasks.isEmpty {
                        EvoSymbolLabel("No schedules in this view.", systemImage: "calendar")
                            .font(EvoFont.text(.subheadline))
                            .foregroundStyle(EvoTheme.Palette.secondary)
                            .padding(.top, 20)
                    } else {
                        ForEach(visibleTasks) { task in
                            taskCard(task)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 24)
                .padding(.bottom, 24)
            }
        }
        .background(Color.white.ignoresSafeArea())
        .task { await model.reloadFromDisk() }
        .sheet(isPresented: $creating) {
            CreateTaskView(initialDate: .now) { title, note, kind, repeatRule, dueAt, steps in
                let saved = await model.create(title: title, note: note, kind: kind, repeatRule: repeatRule, dueAt: dueAt, totalSteps: steps)
                if saved { filter = .active }
                return saved
            }
        }
        .confirmationDialog("Delete schedule?", isPresented: Binding(
            get: { deleting != nil },
            set: { if !$0 { deleting = nil } }
        ), titleVisibility: .visible, presenting: deleting) { task in
            Button("Delete", role: .destructive) { Task { await model.delete(task) } }
        }
    }

    private func taskCard(_ task: NativeTask) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                EvoIcon(systemName: task.kind == .long ? "workflow" : "calendar.badge.clock")
                    .evoSymbol(.standard, weight: .medium)
                    .frame(width: 44, height: 44)
                    .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(EvoTheme.Palette.line))
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 4) {
                    Text(task.title).font(EvoFont.text(.body, weight: .semibold))
                    Text(taskSubtitle(task))
                        .font(EvoFont.text(.subheadline))
                        .foregroundStyle(EvoTheme.Palette.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Menu {
                    if task.state == .active {
                        Button("Pause", systemImage: "pause.circle") { Task { await model.setState(task, .paused) } }
                    } else if task.state == .paused {
                        Button("Resume", systemImage: "play.circle") { Task { await model.setState(task, .active) } }
                    }
                    if task.state != .completed {
                        Button(task.kind == .long ? "Complete next step" : "Mark done", systemImage: "checkmark.circle") {
                            Task { await model.complete(task) }
                        }
                    }
                    Button("Delete", systemImage: "trash", role: .destructive) { deleting = task }
                } label: {
                    EvoIcon(systemName: "ellipsis")
                        .evoSymbol(.toolbar)
                        .foregroundStyle(EvoTheme.Palette.secondary)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Options for \(task.title)")
            }

            if task.kind == .long {
                let progress = min(1, max(0, Double(task.step) / Double(max(1, task.totalSteps))))
                VStack(spacing: 8) {
                    HStack {
                        Text(task.state == .active ? "In progress" : task.state.title)
                            .foregroundStyle(EvoTheme.Palette.secondary)
                        Spacer()
                        Text(progress, format: .percent.precision(.fractionLength(0)))
                            .fontWeight(.semibold)
                    }
                    ProgressView(value: progress)
                        .tint(EvoTheme.Palette.action)
                        .accessibilityLabel("Progress")
                }
                .font(EvoFont.text(.footnote))
            } else if task.state == .active, let date = nextRun(for: task) {
                HStack {
                    let now = Date.now
                    EvoSymbolLabel(date > now ? "Next run" : "Scheduled for", systemImage: "clock")
                        .foregroundStyle(EvoTheme.Palette.secondary)
                    Spacer()
                    if date > now {
                        Text(timerInterval: now...date, countsDown: true)
                            .monospacedDigit()
                            .multilineTextAlignment(.trailing)
                    } else {
                        Text(date.formatted(date: .abbreviated, time: .shortened))
                    }
                }
                .font(EvoFont.text(.footnote, weight: .medium))
            }
        }
        .padding(14)
        .foregroundStyle(EvoTheme.Palette.ink)
        .background(.white, in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(EvoTheme.Palette.line))
    }

    private func nextRun(for task: NativeTask) -> Date? {
        guard let dueAt = task.dueAt else { return nil }
        let calendar = Calendar.current
        let components: Set<Calendar.Component>
        switch task.repeatRule {
        case .once: return dueAt
        case .daily: components = [.hour, .minute]
        case .weekly: components = [.weekday, .hour, .minute]
        }
        return calendar.nextDate(
            after: .now,
            matching: calendar.dateComponents(components, from: dueAt),
            matchingPolicy: .nextTime
        )
    }

    private func taskSubtitle(_ task: NativeTask) -> String {
        if !task.note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return task.note }
        if task.kind == .long { return "Step \(task.step) of \(task.totalSteps)" }
        return task.repeatRule.title
    }
}
