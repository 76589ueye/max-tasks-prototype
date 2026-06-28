import SwiftUI

@main
struct MaxTasksApp: App {
    @State private var isLoggedIn = false
    
    init() {
        // Run sync on launch
        SyncManager.shared.sync()
    }
    
    var body: some Scene {
        WindowGroup {
            Group {
                if isLoggedIn {
                    MainTabShell()
                } else {
                    LoginView(isLoggedIn: $isLoggedIn)
                }
            }
            .onAppear(perform: checkLoginState)
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("auth_change"))) { _ in
                checkLoginState()
            }
        }
    }
    
    private func checkLoginState() {
        // Read securely from Keychain instead of UserDefaults
        let token = KeychainHelper.shared.read(forKey: "max_tasks_token")
        isLoggedIn = (token != nil)
        if isLoggedIn {
            SyncManager.shared.sync()
        }
    }
}

// SwiftUI Tab view shell utilizing SF Symbols
struct MainTabShell: View {
    @State private var showQuickAdd = false
    
    var body: some View {
        TabView {
            TodayView()
                .tabItem {
                    Label("Today", systemImage: "sun.max")
                }
            
            CalendarView()
                .tabItem {
                    Label("Calendar", systemImage: "calendar")
                }
            
            // Empty placeholder for intermediate button
            Text("Smart Add Sheet")
                .tabItem {
                    Label("Add", systemImage: "plus")
                }
                .onAppear {
                    showQuickAdd = true
                }
            
            PlansView()
                .tabItem {
                    Label("Plans", systemImage: "map")
                }
            
            MoreView()
                .tabItem {
                    Label("More", systemImage: "ellipsis")
                }
        }
        .sheet(isPresented: $showQuickAdd) {
            let workspaceId = UserDefaults.standard.string(forKey: "max_tasks_workspace_id") ?? ""
            QuickAddSheet(isPresented: $showQuickAdd, workspaceId: workspaceId)
        }
    }
}

// iOS login view
struct LoginView: View {
    @Binding var isLoggedIn: Bool
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var isSignup = false
    @State private var errorMessage = ""
    @State private var loading = false
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Account Credentials")) {
                    if isSignup {
                        TextField("Name", text: $name)
                            .textInputAutocapitalization(.words)
                    }
                    
                    TextField("Email Address", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.none)
                        
                    SecureField("Password", text: $password)
                }
                
                Section {
                    Button(action: handleAction) {
                        HStack {
                            Spacer()
                            if loading {
                                ProgressView()
                            } else {
                                Text(isSignup ? "Create Free Workspace" : "Access Workspace")
                                    .fontWeight(.bold)
                            }
                            Spacer()
                        }
                    }
                    .disabled(loading)
                }
                
                Section {
                    Button {
                        isSignup.toggle()
                        errorMessage = ""
                    } label: {
                        HStack {
                            Spacer()
                            Text(isSignup ? "Already have a workspace? Sign In" : "Don't have a workspace? Create one")
                                .font(.caption)
                            Spacer()
                        }
                    }
                }
                
                if !errorMessage.isEmpty {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("MaX Tasks")
        }
        .colorScheme(.dark)
    }
    
    private func handleAction() {
        guard !email.isEmpty && !password.isEmpty else { return }
        loading = true
        errorMessage = ""
        
        let path = isSignup ? "signup" : "login"
        guard let url = URL(string: "http://192.168.1.4:8080/api/v1/auth/\(path)") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String]
        if isSignup {
            body = ["email": email, "password": password, "name": name]
        } else {
            body = ["email": email, "password": password]
        }
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                loading = false
                guard error == nil, let data = data else {
                    errorMessage = "Server unreachable"
                    return
                }
                
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    if let token = json["token"] as? String,
                       let workspaceId = json["workspaceId"] as? String {
                        
                        // Write securely to Keychain instead of UserDefaults
                        let success = KeychainHelper.shared.save(token, forKey: "max_tasks_token")
                        if success {
                            UserDefaults.standard.set(workspaceId, forKey: "max_tasks_workspace_id")
                            
                            if let user = json["user"] as? [String: Any],
                               let userData = try? JSONSerialization.data(withJSONObject: user) {
                                UserDefaults.standard.set(userData, forKey: "max_tasks_user")
                            }
                            
                            isLoggedIn = true
                            NotificationCenter.default.post(name: NSNotification.Name("auth_change"), object: nil)
                        } else {
                            errorMessage = "Failed to secure Keychain storage"
                        }
                    } else if let err = json["error"] as? String {
                        errorMessage = err
                    }
                }
            }
        }.resume()
    }
}
