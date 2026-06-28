import SwiftUI

public struct DesignTokens {
    public struct Colors {
        public static let bg = Color(hex: "#0B0C0F")
        public static let surfaceLow = Color(hex: "#0F1014")
        public static let surface = Color(hex: "#14161D")
        public static let surfaceHigh = Color(hex: "#1E212A")
        
        public static let primary = Color(hex: "#FF4D2A") // Ember
        public static let primaryHover = Color(hex: "#E03E1B")
        
        public static let gold = Color(hex: "#E6AF2E")
        public static let purple = Color(hex: "#8B80F0")
        public static let purpleGray = Color(hex: "#6E6888")
        
        public static let textPrimary = Color(hex: "#E3E4E6")
        public static let textSecondary = Color(hex: "#9B9FA9")
        public static let textMuted = Color(hex: "#5F6470")
        
        public static let statusInbox = Color(hex: "#9B9FA9")
        public static let statusPlanned = Color(hex: "#3B82F6")
        public static let statusInProgress = Color(hex: "#F59E0B")
        public static let statusCompleted = Color(hex: "#10B981")
        public static let statusLate = Color(hex: "#EF4444")
        public static let statusCritical = Color(hex: "#F43F5E")
    }
    
    public struct Spacing {
        public static let xs: CGFloat = 4
        public static let sm: CGFloat = 8
        public static let md: CGFloat = 16
        public static let lg: CGFloat = 24
        public static let xl: CGFloat = 32
    }
    
    public struct Radius {
        public static let xs: CGFloat = 4
        public static let sm: CGFloat = 8
        public static let md: CGFloat = 12
        public static let lg: CGFloat = 16
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
