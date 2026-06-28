import SwiftUI

struct PlansView: View {
    @State private var plans: [Plan] = []
    
    var body: some View {
        NavigationStack {
            List {
                // Predefined Template Builders
                Section(header: Text("Predefined Templates")) {
                    Button {
                        applyTemplate("STUDY")
                    } label: {
                        Label("Apply Study Week Template", systemImage: "book.closed.circle.fill")
                            .symbolRenderingMode(.hierarchical)
                    }
                    
                    Button {
                        applyTemplate("PROJECT_LAUNCH")
                    } label: {
                        Label("Apply Product Launch Template", systemImage: "rocket.circle.fill")
                            .symbolRenderingMode(.hierarchical)
                    }
                }
                
                // Active vision campaigns list
                Section(header: Text("Active Vision Campaigns")) {
                    ForEach(plans) { plan in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(plan.title)
                                    .fontWeight(.bold)
                                Spacer()
                                Text("\(plan.progress)%")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            if let vision = plan.vision, !vision.isEmpty {
                                Text(vision)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            ProgressView(value: Double(plan.progress), total: 100)
                                .accentColor(.accentColor)
                        }
                        .padding(.vertical, 4)
                    }
                    
                    if plans.isEmpty {
                        Text("No plans created. Set objectives above.")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Plans")
            .onAppear(perform: loadData)
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("local_cache_update")), perform: { _ in loadData() })
        }
    }
    
    private func loadData() {
        plans = Persistence.shared.queryPlans()
    }
    
    private func applyTemplate(_ type: String) {
        let newId = UUID().uuidString
        let workspaceId = UserDefaults.standard.string(forKey: "max_tasks_workspace_id") ?? ""
        var newPlan: Plan
        
        if type == "STUDY" {
            newPlan = Plan(
                id: newId,
                title: "SwiftUI iOS 26 Mastery Campaign",
                vision: "Build a production-grade native Apple architecture with zero external SDKs",
                type: "STUDY",
                progress: 10,
                workspaceId: workspaceId
            )
        } else {
            newPlan = Plan(
                id: newId,
                title: "Beta Launch Campaign",
                vision: "Deploy monorepo, seed data, and complete offline replication tests",
                type: "PROJECT_LAUNCH",
                progress: 25,
                workspaceId: workspaceId
            )
        }
        
        Persistence.shared.savePlan(newPlan)
        
        loadData()
    }
}
