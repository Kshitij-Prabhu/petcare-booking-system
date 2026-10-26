import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'PetCare Booking & Tracking System',
  description: 'DBMS Level 3 Project — Pet-Care Service Booking & Tracking System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
