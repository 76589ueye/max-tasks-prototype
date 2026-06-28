import React from 'react';
import { 
  Sun as LucideSun, 
  Inbox as LucideInbox, 
  CheckSquare as LucideChecklist, 
  Calendar as LucideCalendar, 
  Map as LucideMap, 
  Folder as LucideFolder, 
  FileText as LucideNoteText, 
  BarChart2 as LucideChartBar, 
  Clock as LucideTimer, 
  Search as LucideMagnifyingGlass, 
  Plus as LucidePlus, 
  Settings as LucideSettings, 
  Bell as LucideReminder, 
  Paperclip as LucideAttachments,
  CheckCircle2 as LucideCompleted, 
  AlertCircle as LucideOverdue, 
  RefreshCw as LucideSync, 
  WifiOff as LucideOffline,
  LogOut as LucideLogOut,
  Menu as LucideMenu,
  Globe as LucideGlobe
} from 'lucide-react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Sun = ({ size = 18, className, style }: IconProps) => <LucideSun size={size} className={className} style={style} />;
export const Inbox = ({ size = 18, className, style }: IconProps) => <LucideInbox size={size} className={className} style={style} />;
export const Tray = Inbox;
export const Checklist = ({ size = 18, className, style }: IconProps) => <LucideChecklist size={size} className={className} style={style} />;
export const Calendar = ({ size = 18, className, style }: IconProps) => <LucideCalendar size={size} className={className} style={style} />;
export const Map = ({ size = 18, className, style }: IconProps) => <LucideMap size={size} className={className} style={style} />;
export const Folder = ({ size = 18, className, style }: IconProps) => <LucideFolder size={size} className={className} style={style} />;
export const NoteText = ({ size = 18, className, style }: IconProps) => <LucideNoteText size={size} className={className} style={style} />;
export const ChartBar = ({ size = 18, className, style }: IconProps) => <LucideChartBar size={size} className={className} style={style} />;
export const Timer = ({ size = 18, className, style }: IconProps) => <LucideTimer size={size} className={className} style={style} />;
export const MagnifyingGlass = ({ size = 18, className, style }: IconProps) => <LucideMagnifyingGlass size={size} className={className} style={style} />;
export const Plus = ({ size = 18, className, style }: IconProps) => <LucidePlus size={size} className={className} style={style} />;
export const Settings = ({ size = 18, className, style }: IconProps) => <LucideSettings size={size} className={className} style={style} />;
export const Reminder = ({ size = 18, className, style }: IconProps) => <LucideReminder size={size} className={className} style={style} />;
export const Attachments = ({ size = 18, className, style }: IconProps) => <LucideAttachments size={size} className={className} style={style} />;
export const Completed = ({ size = 18, className, style }: IconProps) => <LucideCompleted size={size} className={className} style={style} />;
export const Overdue = ({ size = 18, className, style }: IconProps) => <LucideOverdue size={size} className={className} style={style} />;
export const Sync = ({ size = 18, className, style }: IconProps) => <LucideSync size={size} className={className} style={style} />;
export const Offline = ({ size = 18, className, style }: IconProps) => <LucideOffline size={size} className={className} style={style} />;
export const LogOut = ({ size = 18, className, style }: IconProps) => <LucideLogOut size={size} className={className} style={style} />;
export const Menu = ({ size = 18, className, style }: IconProps) => <LucideMenu size={size} className={className} style={style} />;
export const Globe = ({ size = 18, className, style }: IconProps) => <LucideGlobe size={size} className={className} style={style} />;
