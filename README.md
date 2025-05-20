# Firestore Admin Panel

A modern, feature-rich admin panel for Firestore databases built with Next.js, Mantine UI, and Firebase Authentication.

## Features

### Dynamic Collection Management
- Automatically generates UI based on collection field definitions
- Support for various field types (text, number, boolean, select, date, email, url)
- Field validation with customizable rules
- Real-time updates and synchronization

### Advanced Search and Filtering
- Full-text search across all fields
- Advanced filtering with multiple conditions
- Field-specific filters with appropriate operators
- Sortable columns
- Pagination for large datasets

### Data Management
- Create, read, update, and delete (CRUD) operations
- Bulk operations (edit, delete)
- CSV import/export functionality
- Document validation before saving
- Batch operations for atomic updates

### Change Tracking
- Comprehensive changelog system
- Tracks all document operations (create, update, delete)
- Records who made the changes and when
- Stores before and after states for each change
- Easy access through the changelog page
- Detailed change history view

### Role-Based Access Control
- Granular permissions system
- Role-based access to collections and operations
- Custom role creation and management
- Permission inheritance
- User role assignment

### Security
- Firebase Authentication integration
- Secure session management
- Role-based access control
- Field-level security
- Audit logging

### User Interface
- Modern, responsive design with Mantine UI
- Dark/light theme support
- Intuitive navigation
- Mobile-friendly layout
- Loading states and error handling

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your Firebase project and add the configuration
4. Run the development server:
   ```bash
   npm run dev
   ```

## Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable Authentication and Firestore
3. Add your Firebase configuration to the project

### Collection Configuration
Collections can be configured through the admin panel:
1. Define field types and validation rules
2. Set up field order and display options
3. Configure access permissions

## Usage

### Managing Collections
- Create and configure collections through the settings page
- Define fields with appropriate types and validation rules
- Set up access permissions for different roles

### Managing Documents
- View and edit documents in a table format
- Use advanced search and filtering
- Perform bulk operations
- Import/export data via CSV

### Tracking Changes
- Access the changelog page to view all changes
- See who made changes and when
- View detailed before/after states
- Filter changes by collection, user, or action type

### User Management
- Create and manage user accounts
- Assign roles and permissions
- Monitor user activity

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- Firebase project with Firestore and Authentication enabled
- Yarn or npm
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/firestore-admin-panel.git
   cd firestore-admin-panel
   ```

2. Install dependencies:
   ```bash
   yarn install
   # or
   npm install
   ```

3. Create a `.env.local` file with your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. Set up Firebase:
   - Go to Firebase Console (https://console.firebase.google.com)
   - Create a new project or select existing one
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Create a web app to get configuration
   - Copy configuration to `.env.local`

5. Initialize Firestore:
   - Create the following collections in Firestore:
     - `users`
     - `roles`
     - `config/collections/items`
     - `app_config/global`
   - Add initial admin user:
     ```javascript
     {
       email: "admin@example.com",
       role: "admin",
       createdAt: Timestamp.now()
     }
     ```
   - Add default role:
     ```javascript
     {
       name: "admin",
       permissions: {
         canView: true,
         canEdit: true,
         canDelete: true,
         canManageRoles: true
       }
     }
     ```

6. Run the development server:
   ```bash
   yarn dev
   # or
   npm run dev
   ```

7. Access the application:
   - Open http://localhost:3000
   - Login with admin credentials
   - Start managing your collections!

## 📁 Project Structure

```
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── dashboard/         # Dashboard and collection views
│   │   ├── login/            # Authentication pages
│   │   └── settings/         # Admin settings
│   ├── lib/                   # Shared utilities and components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── components/       # Reusable UI components
│   │   └── firebaseConfig.ts # Firebase configuration
│   └── types/                # TypeScript type definitions
```

## 🔧 Configuration

### Firestore Structure

The admin panel expects the following Firestore structure:

- `users/{uid}` - User documents with roles
- `roles/{role}` - Role definitions and permissions
- `config/collections/items/{collectionName}` - Collection configurations
- `app_config/global` - Global application settings

### Adding a New Collection

1. Navigate to the Settings page
2. Enter collection name and define fields
3. Choose field types (text, number, boolean, select)
4. For select fields, define comma-separated options
5. Click "Create Collection"

### Managing Roles

1. Access the Settings page
2. Create new roles or modify existing ones
3. Toggle permissions for each role:
   - canView
   - canEdit
   - canDelete
   - canManageRoles

## 📊 Data Management Features

### CSV Import/Export
- Export collection data to CSV
- Import data from CSV with validation
- Automatic field type conversion
- Error handling for invalid data
- Progress tracking for large imports

### Advanced Search
- Real-time text search
- Field-specific filters
- Number comparison operators
- Boolean filters
- Select field filtering
- Clear all filters option

### Bulk Operations
- Select multiple documents
- Bulk edit field values
- Bulk delete with confirmation
- Progress tracking for operations

## 🛡️ Security

- Implement proper Firestore security rules
- Use environment variables for sensitive data
- Regular security audits
- Keep dependencies updated
- Input validation for all operations
- Type safety with TypeScript

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Mantine UI](https://mantine.dev/)
- [Firebase](https://firebase.google.com/)
- [TypeScript](https://www.typescriptlang.org/)

## 📦 Development

### Available Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Type Check
npm run type-check

# Lint
npm run lint

# Format Code
npm run format
```

### Requirements

- Node.js 18 or later
- Firebase project with Firestore enabled
- Proper environment variables set up

## 📄 License

MIT

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure Firebase Authentication is enabled
   - Check if email/password sign-in method is enabled
   - Verify Firebase configuration in `.env.local`
   - Clear browser cache and cookies

2. **Firestore Permission Errors**
   - Check Firebase security rules
   - Verify user roles and permissions
   - Ensure proper collection structure
   - Check if user is authenticated

3. **Build/Deployment Issues**
   - Clear `.next` folder and node_modules
   - Run `npm install` or `yarn install`
   - Check Node.js version compatibility
   - Verify environment variables

4. **Performance Issues**
   - Check network tab for slow requests
   - Verify Firestore indexes
   - Monitor Firebase usage quotas
   - Check for large collections

### Debug Mode

Enable debug mode by setting:
```env
NEXT_PUBLIC_DEBUG=true
```

This will show detailed error messages and logging.

## ❓ FAQ

### General Questions

1. **What are the system requirements?**
   - Node.js 18.x or later
   - Modern web browser (Chrome, Firefox, Safari, Edge)
   - Firebase project with Firestore and Authentication

2. **How do I add new collections?**
   - Go to Settings page
   - Click "Add Collection"
   - Define fields and types
   - Save configuration

3. **How do I manage user roles?**
   - Access Settings > Roles
   - Create or edit roles
   - Assign permissions
   - Assign roles to users

4. **How do I import/export data?**
   - Use CSV import/export feature
   - Format CSV according to collection structure
   - Validate data before import
   - Check export for proper formatting

### Technical Questions

1. **How do I customize the UI?**
   - Modify Mantine theme in `src/lib/theme.ts`
   - Override component styles
   - Add custom components
   - Modify layout in `src/app/layout.tsx`

2. **How do I add custom fields?**
   - Define field type in collection config
   - Add field validation
   - Update UI components
   - Handle data conversion

3. **How do I implement custom authentication?**
   - Modify `src/lib/firebase/auth.ts`
   - Add custom auth providers
   - Update security rules
   - Handle auth state

4. **How do I optimize performance?**
   - Use pagination
   - Implement caching
   - Optimize queries
   - Use proper indexes

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Mantine UI Documentation](https://mantine.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 🆘 Support

For support, please:
1. Check the FAQ section
2. Review troubleshooting guide
3. Search existing issues
4. Create a new issue with:
   - Detailed description
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details
