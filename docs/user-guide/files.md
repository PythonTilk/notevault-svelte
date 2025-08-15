# File Management

NoteVault provides comprehensive file management capabilities, allowing you to upload, organize, share, and collaborate on files of all types. This guide covers everything from basic file operations to advanced file collaboration features.

## 📁 Overview

### Supported File Types

#### Document Files
- **Text Documents**: PDF, DOC, DOCX, TXT, RTF
- **Spreadsheets**: XLS, XLSX, CSV, ODS
- **Presentations**: PPT, PPTX, ODP
- **Markup**: HTML, XML, JSON, YAML

#### Media Files
- **Images**: JPG, PNG, GIF, SVG, WebP, TIFF, BMP
- **Videos**: MP4, WebM, AVI, MOV, WMV
- **Audio**: MP3, WAV, OGG, M4A, FLAC
- **Vector Graphics**: SVG, AI, EPS

#### Development Files
- **Source Code**: JS, TS, Python, Java, C++, PHP, Ruby
- **Configuration**: JSON, YAML, XML, INI, ENV
- **Documentation**: MD, README, LICENSE
- **Archives**: ZIP, RAR, 7Z, TAR.GZ

#### Specialized Files
- **Design**: PSD, SKETCH, FIGMA, XD
- **CAD**: DWG, DXF, STL
- **Database**: SQL, DB, SQLite
- **Fonts**: TTF, OTF, WOFF, WOFF2

### File Size Limits

#### Upload Limits
```
File Size Limits by Plan:
Free Plan: 5 MB per file, 1 GB total storage
Pro Plan: 25 MB per file, 100 GB total storage
Team Plan: 100 MB per file, 1 TB total storage
Enterprise: 500 MB per file, Unlimited storage
```

#### Storage Quotas
- **Individual Quotas**: Per-user storage limits
- **Workspace Quotas**: Shared workspace storage
- **Organization Quotas**: Enterprise-wide limits
- **Usage Monitoring**: Real-time storage tracking

## 📤 Uploading Files

### Upload Methods

#### Drag & Drop Upload
1. **Simple Drag**: Drag files from computer to file area
2. **Bulk Upload**: Select multiple files at once
3. **Folder Upload**: Drag entire folders (maintains structure)
4. **Progress Tracking**: Real-time upload progress indicators

#### Traditional Upload
1. **Click Upload Button**: Use upload button in toolbar
2. **File Browser**: Browse and select files
3. **Multi-select**: Hold Ctrl/Cmd to select multiple files
4. **Upload Queue**: Queue multiple uploads

#### Paste Upload
- **Clipboard Images**: Paste screenshots and images
- **Copy-Paste Files**: Paste files copied from file manager
- **Quick Upload**: Instant upload without file selection

#### Mobile Upload
- **Camera Integration**: Take photos directly in app
- **Gallery Access**: Upload from device photo gallery
- **File Picker**: Access device file system
- **Cloud Integration**: Upload from Google Drive, iCloud

### Upload Interface

#### Upload Progress
```
Upload Status:
📁 design-mockups.zip
   ▓▓▓▓▓▓▓▓▓░ 85% (4.2 MB / 4.9 MB)
   ⏱️ 15 seconds remaining

📷 screenshot.png
   ▓▓▓▓▓▓▓▓▓▓ 100% Complete ✅

📄 project-brief.pdf
   ⏳ Queued for upload
```

#### Batch Operations
- **Select All**: Select all files for batch operations
- **Bulk Tagging**: Apply tags to multiple files
- **Bulk Move**: Move multiple files to folders
- **Bulk Delete**: Delete multiple files at once
- **Bulk Download**: Download multiple files as ZIP

### Upload Settings

#### Default Settings
```
Upload Configuration:
Auto-extract ZIP files: Enabled
Generate thumbnails: Enabled
Scan for malware: Enabled
Duplicate handling: Skip duplicates
File naming: Original names
```

#### Advanced Options
- **File Naming**: Rename during upload
- **Duplicate Handling**: Skip, replace, or rename duplicates
- **Compression**: Auto-compress large images
- **Metadata Extraction**: Extract file metadata
- **Version Control**: Create versions for duplicates

## 🗂️ File Organization

### Folder Structure

#### Creating Folders
1. **New Folder Button**: Click "New Folder" in toolbar
2. **Right-click Menu**: Right-click empty space → "New Folder"
3. **Keyboard Shortcut**: Press `Ctrl/Cmd + Shift + N`
4. **Drag Organization**: Drag files to create folders automatically

#### Folder Management
```
Folder Operations:
📁 Project Files
  ├── 📁 Documents
  │   ├── 📄 requirements.pdf
  │   └── 📄 specifications.docx
  ├── 📁 Images
  │   ├── 🖼️ mockup-v1.png
  │   └── 🖼️ mockup-v2.png
  └── 📁 Resources
      ├── 📊 data.xlsx
      └── 📄 references.pdf
```

#### Folder Features
- **Nested Folders**: Create unlimited folder hierarchy
- **Folder Permissions**: Set access levels per folder
- **Folder Sharing**: Share entire folders with teams
- **Folder Templates**: Create standard folder structures
- **Color Coding**: Assign colors to folders for organization

### Tagging System

#### File Tags
```
Tag Categories:
Content Tags: #document, #image, #video, #code
Project Tags: #project-alpha, #marketing, #design
Status Tags: #draft, #review, #approved, #final
Priority Tags: #urgent, #important, #normal, #low
Team Tags: #team-design, #team-dev, #team-marketing
```

#### Auto-tagging
- **File Type Tags**: Automatically tag by file type
- **Content Recognition**: AI-powered content tagging
- **Metadata Tags**: Extract tags from file metadata
- **Smart Suggestions**: Suggest relevant tags based on content

#### Tag Management
- **Tag Filtering**: Filter files by single or multiple tags
- **Tag Editing**: Bulk edit tags across multiple files
- **Tag Analytics**: See most used tags and patterns
- **Tag Cleanup**: Remove unused or duplicate tags

### File Views

#### List View
```
📄 project-requirements.pdf    2.1 MB    Aug 15, 2025
📊 q4-budget-analysis.xlsx     856 KB    Aug 14, 2025
🖼️ team-photo-2025.jpg         3.4 MB    Aug 13, 2025
📄 meeting-notes.docx          245 KB    Aug 12, 2025
```

#### Grid View
```
[📄]    [📊]    [🖼️]    [📄]
Brief   Budget  Photo   Notes
2.1MB   856KB   3.4MB   245KB
```

#### Details View
```
📄 project-requirements.pdf
   Size: 2.1 MB
   Modified: Aug 15, 2025 at 3:45 PM
   Created: Aug 10, 2025 at 9:30 AM
   Tags: #requirements, #project-alpha, #draft
   Shared with: 5 team members
   Downloads: 12 times
```

#### Thumbnail View
- **Image Previews**: Thumbnail previews for images
- **Document Previews**: First page preview for documents
- **Video Thumbnails**: Frame preview for videos
- **Custom Thumbnails**: Upload custom thumbnail images

## 🔍 File Search & Discovery

### Search Capabilities

#### File Search
```
Search Examples:
"budget analysis" - Find files with exact phrase
type:pdf - Find all PDF files
size:>10MB - Find files larger than 10MB
modified:today - Find files modified today
tag:urgent - Find files tagged as urgent
folder:"Project Files" - Search within specific folder
```

#### Advanced Filters
- **File Type**: Filter by specific file types or categories
- **Size Range**: Find files within size parameters
- **Date Range**: Search by creation or modification dates
- **Author**: Find files uploaded by specific users
- **Shared Status**: Filter by sharing permissions
- **Download Count**: Sort by popularity

#### Content Search
- **Full-text Search**: Search inside document content
- **OCR Search**: Search text in scanned documents and images
- **Metadata Search**: Search file properties and metadata
- **Audio Transcription**: Search spoken content in audio files
- **Video Analysis**: Search video content and captions

### Smart Discovery

#### Related Files
- **Similarity Detection**: Find files with similar content
- **Version Detection**: Identify different versions of same file
- **Reference Tracking**: Find files that reference each other
- **Usage Patterns**: Discover frequently accessed files together

#### Recommendations
```
Recommended Files:
📄 "API Documentation v2.0" - Related to your current project
📊 "Q3 Performance Report" - Frequently viewed with current file
🖼️ "Brand Guidelines 2025" - Tagged with similar keywords
📄 "Meeting Notes - Aug 10" - From same time period
```

## 👁️ File Previews

### Preview System

#### Supported Previews
- **Documents**: PDF, Word, PowerPoint, Excel
- **Images**: All image formats with zoom and pan
- **Videos**: HTML5 video player with controls
- **Audio**: Waveform player with timeline
- **Code**: Syntax-highlighted code viewer
- **Text**: Plain text with line numbers

#### Preview Features
```
Preview Controls:
🔍 Zoom In/Out
📏 Fit to Window
🔄 Rotate (for images)
📱 Mobile-optimized viewing
⬇️ Download original file
📤 Share preview link
💬 Add comments to preview
```

#### Interactive Previews
- **PDF Navigation**: Page navigation, search within PDF
- **Image Annotation**: Add comments and markups to images
- **Video Scrubbing**: Precise video timeline navigation
- **Code Highlighting**: Syntax highlighting for programming languages
- **Spreadsheet Viewing**: Navigate sheets and cells

### Thumbnail Generation

#### Automatic Thumbnails
- **Image Thumbnails**: Automatic generation for all images
- **Document Thumbnails**: First page preview for documents
- **Video Thumbnails**: Representative frame selection
- **Custom Thumbnails**: Upload or generate custom previews

#### Thumbnail Management
- **Size Options**: Multiple thumbnail sizes available
- **Quality Settings**: Balance quality vs. loading speed
- **Regeneration**: Update thumbnails when files change
- **Caching**: Efficient thumbnail caching for performance

## 🤝 File Sharing & Collaboration

### Sharing Options

#### Internal Sharing
```
Workspace Sharing:
👥 All workspace members (Default)
👤 Specific team members only
🔒 Private (Owner only)
👁️ View-only access
✏️ Edit permissions
⬇️ Download permissions
```

#### External Sharing
- **Public Links**: Share files with anyone via link
- **Password Protection**: Protect shared links with passwords
- **Expiration Dates**: Set automatic link expiration
- **Download Limits**: Limit number of downloads
- **View Tracking**: Track who accessed shared files

#### Permission Levels
```
Permission Types:
🔍 View Only - Can view and comment only
⬇️ Download - Can view and download
✏️ Edit - Can view, download, and edit
👥 Share - Can view, download, edit, and share
🛡️ Admin - Full control including deletion
```

### Collaboration Features

#### File Comments
- **File-level Comments**: Comments on entire file
- **Annotation Comments**: Comments on specific parts of images/PDFs
- **Thread Discussions**: Reply to comments for detailed discussions
- **Comment Resolution**: Mark comments as resolved
- **Comment Notifications**: Get notified of new comments

#### Version Control
```
Version History:
v1.0 - Initial upload (Aug 10, 2:00 PM) by John Doe
v1.1 - Minor corrections (Aug 11, 9:15 AM) by Jane Smith
v1.2 - Major revision (Aug 12, 3:30 PM) by John Doe
v2.0 - Final version (Aug 15, 1:45 PM) by Bob Wilson

[View] [Download] [Restore] [Compare]
```

#### Real-time Collaboration
- **Live Editing**: Simultaneous editing of supported formats
- **Presence Indicators**: See who's currently viewing files
- **Edit Locks**: Prevent conflicts during active editing
- **Change Notifications**: Real-time updates of file changes

### File Workflows

#### Approval Workflows
```
File Approval Process:
1. Upload → 2. Review Request → 3. Team Review → 
4. Feedback → 5. Revisions → 6. Final Approval

Status Indicators:
🟡 Pending Review
🔵 In Review
🟠 Needs Revision
🟢 Approved
🔴 Rejected
```

#### Review System
- **Review Assignments**: Assign specific reviewers
- **Review Deadlines**: Set review completion dates
- **Review Templates**: Standardize review criteria
- **Review History**: Track all review activity
- **Automated Reminders**: Send review deadline reminders

## 📊 File Analytics

### Usage Statistics

#### File Metrics
```
File Performance:
📄 project-requirements.pdf
   Views: 89 total views
   Downloads: 23 downloads
   Shares: 7 external shares
   Comments: 12 comments
   Last Activity: 2 hours ago
   Top Viewers: John (15), Jane (12), Bob (8)
```

#### Access Patterns
- **View Frequency**: How often files are accessed
- **Download Patterns**: When and how files are downloaded
- **Sharing Activity**: External sharing usage
- **Device Access**: Desktop vs. mobile access patterns
- **Geographic Access**: Where files are accessed from

#### Content Insights
- **Popular File Types**: Most accessed file formats
- **File Size Distribution**: Storage usage by file size
- **Tag Performance**: Most effective tags for discovery
- **Search Queries**: What users search for
- **Collaboration Metrics**: How files are used in collaboration

### Storage Analytics

#### Storage Usage
```
Storage Overview:
Total Used: 47.2 GB / 100 GB (47%)
Files: 2,847 files
Folders: 156 folders
Largest Files: design-assets.zip (2.1 GB)
File Types: Images (35%), Documents (28%), Videos (22%)
```

#### Storage Optimization
- **Duplicate Detection**: Find and merge duplicate files
- **Large File Analysis**: Identify storage-heavy files
- **Unused File Detection**: Find rarely accessed files
- **Archive Suggestions**: Recommend files for archiving
- **Cleanup Recommendations**: Suggest storage optimizations

## 🔧 Advanced Features

### File Processing

#### Automatic Processing
- **Image Optimization**: Automatic compression and resizing
- **Document OCR**: Extract text from scanned documents
- **Video Transcoding**: Convert videos to web-friendly formats
- **Audio Processing**: Normalize audio levels
- **Metadata Extraction**: Extract EXIF and document metadata

#### Custom Processing
- **Image Transformations**: Resize, crop, and filter images
- **Document Conversion**: Convert between document formats
- **Archive Extraction**: Automatically extract ZIP files
- **Batch Processing**: Apply operations to multiple files
- **API Integration**: Connect to external processing services

### Integration Features

#### Cloud Storage Sync
```
Connected Services:
☁️ Google Drive - 2-way sync enabled
☁️ Dropbox - Import only
☁️ OneDrive - Export only
☁️ Box - Full integration
☁️ AWS S3 - Backup destination
```

#### External Tools
- **Design Tools**: Figma, Sketch, Adobe Creative Suite
- **Development**: GitHub, GitLab, code repositories
- **Productivity**: Office 365, Google Workspace
- **Communication**: Slack, Teams, Discord
- **Project Management**: Asana, Trello, Jira

### Automation

#### Automated Workflows
- **File Organization**: Auto-sort files based on type/content
- **Tag Assignment**: Automatically tag files based on content
- **Notification Triggers**: Send alerts when files are uploaded
- **Backup Scheduling**: Automatic backup to external storage
- **Archive Rules**: Auto-archive files based on age or access

#### Smart Features
```
AI-Powered Features:
🤖 Content Recognition - Identify objects in images
🔍 Smart Search - Understand natural language queries
📋 Auto-tagging - Suggest relevant tags
🗂️ Smart Organization - Recommend folder structures
📊 Usage Insights - Analyze file usage patterns
```

## 🎯 Best Practices

### Organization Best Practices

#### Folder Structure
```
Recommended Structure:
📁 01-Active-Projects
  ├── 📁 Project-Alpha
  ├── 📁 Project-Beta
  └── 📁 Project-Gamma
📁 02-Resources
  ├── 📁 Templates
  ├── 📁 Brand-Assets
  └── 📁 Reference-Materials
📁 03-Archive
  ├── 📁 2024-Projects
  └── 📁 Completed-Work
```

#### Naming Conventions
```
Good Examples:
✅ "2025-08-15_Meeting-Notes_Project-Alpha.pdf"
✅ "Logo_Company_Version-2.1_Final.png"
✅ "Budget_Q4-2025_Department-Marketing.xlsx"
✅ "API-Documentation_v3.2_2025-08-15.pdf"

Avoid:
❌ "New Document.pdf"
❌ "Image1.jpg"
❌ "Untitled.docx"
❌ "Copy of file.zip"
```

#### Tagging Strategy
- **Consistent Tags**: Use standardized tag vocabulary
- **Hierarchical Tags**: Create tag hierarchies for better organization
- **Meaningful Tags**: Use descriptive, searchable tags
- **Regular Cleanup**: Remove unused tags periodically
- **Team Standards**: Establish team tagging guidelines

### Security Best Practices

#### File Security
- **Access Control**: Regularly review file permissions
- **Sensitive Data**: Use appropriate sharing restrictions
- **External Sharing**: Monitor and audit external shares
- **Download Tracking**: Track file download activity
- **Regular Audits**: Conduct periodic security reviews

#### Data Protection
- **Backup Strategy**: Maintain regular backups
- **Version Control**: Keep important file versions
- **Secure Sharing**: Use password protection for sensitive files
- **Access Logs**: Monitor file access patterns
- **Compliance**: Follow industry-specific requirements

### Performance Optimization

#### Upload Optimization
- **File Compression**: Compress large files before upload
- **Batch Uploads**: Upload multiple files efficiently
- **Connection Quality**: Use stable internet connections
- **File Formats**: Choose appropriate file formats
- **Size Management**: Split very large files when possible

#### Storage Management
- **Regular Cleanup**: Remove unnecessary files
- **Archive Strategy**: Move old files to archive folders
- **Duplicate Management**: Find and remove duplicates
- **Size Monitoring**: Track storage usage regularly
- **Optimization Tools**: Use built-in optimization features

## 🚨 Troubleshooting

### Common Issues

#### Upload Problems
```
Issue: File won't upload
Solutions:
1. Check file size limits
2. Verify file type is supported
3. Check internet connection
4. Clear browser cache
5. Try different browser
6. Check storage quota
```

#### Access Issues
```
Issue: Can't access shared file
Solutions:
1. Check sharing permissions
2. Verify link hasn't expired
3. Check workspace membership
4. Try refreshing browser
5. Contact file owner
6. Check browser permissions
```

#### Performance Issues
```
Issue: Slow file loading
Solutions:
1. Check internet speed
2. Clear browser cache
3. Reduce preview quality
4. Use different device
5. Contact support for server issues
```

### Error Messages

#### Common Error Codes
```
File Error Messages:
FILE_TOO_LARGE - File exceeds size limit
UNSUPPORTED_TYPE - File type not supported
QUOTA_EXCEEDED - Storage quota exceeded
PERMISSION_DENIED - Insufficient permissions
NETWORK_ERROR - Connection problem
VIRUS_DETECTED - File contains malware
```

#### Resolution Steps
- **File Size**: Compress or split large files
- **File Type**: Convert to supported format
- **Permissions**: Contact workspace admin
- **Storage**: Clear space or upgrade plan
- **Network**: Check connection and try again
- **Security**: Scan file for malware

### Getting Help

#### Self-Service Options
- **Help Tooltips**: Hover over interface elements
- **Video Tutorials**: Step-by-step file management guides
- **Knowledge Base**: Search comprehensive help articles
- **Community Forum**: Ask questions and get answers

#### Support Channels
- **In-App Help**: Access help from within the application
- **Live Chat**: Real-time support during business hours
- **Email Support**: Detailed support via email
- **Phone Support**: Direct phone support for urgent issues

---

## Quick Reference

### Keyboard Shortcuts
| Action | Shortcut | Context |
|--------|----------|---------|
| Upload File | `Ctrl/Cmd + U` | Files panel |
| New Folder | `Ctrl/Cmd + Shift + N` | Files panel |
| Search Files | `Ctrl/Cmd + F` | Files panel |
| Select All | `Ctrl/Cmd + A` | Files panel |
| Delete Selected | `Delete` | Files panel |
| Rename | `F2` | Selected file |
| Properties | `Alt + Enter` | Selected file |

### File Size Quick Reference
| Plan | Max File Size | Total Storage |
|------|---------------|---------------|
| Free | 5 MB | 1 GB |
| Pro | 25 MB | 100 GB |
| Team | 100 MB | 1 TB |
| Enterprise | 500 MB | Unlimited |

### Supported Formats Summary
| Category | Common Formats |
|----------|----------------|
| Documents | PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX |
| Images | JPG, PNG, GIF, SVG, WebP |
| Videos | MP4, WebM, AVI, MOV |
| Audio | MP3, WAV, OGG, M4A |
| Code | JS, TS, Python, Java, HTML, CSS |
| Archives | ZIP, RAR, 7Z, TAR.GZ |

---

*Last Updated: August 15, 2025*  
*Next: [Search & Discovery →](./search.md)*