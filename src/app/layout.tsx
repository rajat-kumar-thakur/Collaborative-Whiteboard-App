@@ .. @@
 import React from 'react';
+import './globals.css';
import { SocketProvider } from '@/components/providers/SocketProvider';

 export const metadata = {
-  title: 'Vite + React + TS',
-  description: 'A Vite + React + TypeScript starter template',
+  title: 'CollabBoard - Real-time Collaborative Whiteboard',
+  description: 'Create, draw, and brainstorm together with your team in real-time',
 };

 export default function RootLayout({
@@ .. @@
 }) {
   return (
     <html lang="en">
      <body className="antialiased">
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
+      <body className="antialiased">{children}</body>
     </html>
   );
 }