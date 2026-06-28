import Foundation

public struct User: Codable, Identifiable {
    public let id: String
    public let email: String
    public let name: String
}

public struct Workspace: Codable, Identifiable {
    public let id: String
    public let name: String
    public let ownerId: String
}

public struct Project: Codable, Identifiable, Hashable {
    public let id: String
    public var name: String
    public var description: String?
    public var icon: String?
    public var color: String?
    public var status: String
    public let workspaceId: String
    public var revision: Int
    
    public init(id: String, name: String, description: String? = nil, icon: String? = nil, color: String? = nil, status: String = "ON_TRACK", workspaceId: String, revision: Int = 1) {
        self.id = id
        self.name = name
        self.description = description
        self.icon = icon
        self.color = color
        self.status = status
        self.workspaceId = workspaceId
        self.revision = revision
    }
}

public struct Plan: Codable, Identifiable, Hashable {
    public let id: String
    public var title: String
    public var vision: String?
    public var type: String
    public var progress: Int
    public let workspaceId: String
    public var revision: Int
    
    public init(id: String, title: String, vision: String? = nil, type: String = "PERSONAL", progress: Int = 0, workspaceId: String, revision: Int = 1) {
        self.id = id
        self.title = title
        self.vision = vision
        self.type = type
        self.progress = progress
        self.workspaceId = workspaceId
        self.revision = revision
    }
}

public struct Task: Codable, Identifiable, Hashable {
    public let id: String
    public var title: String
    public var description: String?
    public var status: String
    public var priority: String
    public var dueDate: String?
    public var timeOfDay: String?
    public var expectedDuration: Int?
    public var projectId: String?
    public var planId: String?
    public let workspaceId: String
    public var revision: Int
    
    public init(id: String, title: String, description: String? = nil, status: String = "INBOX", priority: String = "MEDIUM", dueDate: String? = nil, timeOfDay: String? = nil, expectedDuration: Int? = nil, projectId: String? = nil, planId: String? = nil, workspaceId: String, revision: Int = 1) {
        self.id = id
        self.title = title
        self.description = description
        self.status = status
        self.priority = priority
        self.dueDate = dueDate
        self.timeOfDay = timeOfDay
        self.expectedDuration = expectedDuration
        self.projectId = projectId
        self.planId = planId
        self.workspaceId = workspaceId
        self.revision = revision
    }
}

public struct Note: Codable, Identifiable, Hashable {
    public let id: String
    public var title: String
    public var content: String
    public var isPinned: Bool
    public let workspaceId: String
    public var revision: Int
    
    public init(id: String, title: String, content: String = "", isPinned: Bool = false, workspaceId: String, revision: Int = 1) {
        self.id = id
        self.title = title
        self.content = content
        self.isPinned = isPinned
        self.workspaceId = workspaceId
        self.revision = revision
    }
}

public struct CalendarEvent: Codable, Identifiable, Hashable {
    public let id: String
    public var title: String
    public var description: String?
    public var startDate: String
    public var endDate: String
    public var isAllDay: Bool
    public let workspaceId: String
    public var revision: Int
    
    public init(id: String, title: String, description: String? = nil, startDate: String, endDate: String, isAllDay: Bool, workspaceId: String, revision: Int = 1) {
        self.id = id
        self.title = title
        self.description = description
        self.startDate = startDate
        self.endDate = endDate
        self.isAllDay = isAllDay
        self.workspaceId = workspaceId
        self.revision = revision
    }
}

public struct Habit: Codable, Identifiable, Hashable {
    public let id: String
    public var name: String
    public var frequency: String
    public var streak: Int
    public let workspaceId: String
    public var revision: Int
    
    public init(id: String, name: String, frequency: String, streak: Int = 0, workspaceId: String, revision: Int = 1) {
        self.id = id
        self.name = name
        self.frequency = frequency
        self.streak = streak
        self.workspaceId = workspaceId
        self.revision = revision
    }
}

public struct HabitLog: Codable, Identifiable, Hashable {
    public let id: String
    public let habitId: String
    public let date: String
    public let completed: Bool
}

public struct SyncMutation: Codable {
    public let type: String
    public let table: String
    public let entityId: String
    public let clientTimestamp: Int64
    public let data: [String: String]?
}
