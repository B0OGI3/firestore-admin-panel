# Firestore Admin Panel

A powerful and flexible admin panel for Firebase/Firestore built with Next.js 15, Mantine UI v8, and Firebase Authentication.

## 🌟 Features

- **Dynamic Collection Management**
  - View and manage any Firestore collection
  - Automatic UI generation based on field types
  - Support for text, number, boolean, and select fields
  - Inline document editing
  - Real-time search and filtering

- **Role-Based Access Control (RBAC)**
  - Dynamic role management
  - Granular permissions (view, edit, delete, manage roles)
  - Permission-based UI components
  - Default role configuration

- **Modern Tech Stack**
  - Next.js 15 with App Router
  - Mantine UI v8 for beautiful components
  - Firebase Authentication
  - Firestore for data storage
  - TypeScript for type safety

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- Firebase project with Firestore and Authentication enabled
- Yarn or npm

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

4. Run the development server:
   ```bash
   yarn dev
   # or
   npm run dev
   ```

## 📁 Project Structure

```
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── dashboard/         # Dashboard and collection views
│   │   ├── login/            # Authentication pages
│   │   └── settings/         # Admin settings
├── lib/                      # Shared utilities and components
│   ├── hooks/               # Custom React hooks
│   ├── components/          # Reusable UI components
│   └── firebaseConfig.ts    # Firebase configuration
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

## 🛡️ Security

- Implement proper Firestore security rules
- Use environment variables for sensitive data
- Regular security audits
- Keep dependencies updated

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

## Deployment on Vercel

1. Fork or clone this repository
2. Create a new project on Vercel
3. Connect your repository to Vercel
4. Set up environment variables in Vercel project settings:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
   ```
5. Deploy!

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file with your Firebase configuration (see `.env.example`)

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Build

```bash
npm run build
```

## Type Check

```bash
npm run type-check
```

## Lint

```bash
npm run lint
```

## Format Code

```bash
npm run format
```

## Requirements

- Node.js 18 or later
- Firebase project with Firestore enabled
- Proper environment variables set up

## License

MIT
