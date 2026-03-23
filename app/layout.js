import './globals.css';

export const metadata = {
  title: 'Golf Charity Subscription Platform',
  description: 'Subscription, score tracking, charity, draw engine, and admin control.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <div className="nav">
            <div>
              <div className="brand">Golf Charity Subscription Platform</div>
              <div className="small muted">Subscription, scores, draws, and charity support</div>
            </div>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
