import './globals.css'

export const metadata = {
  title: 'Product Feedback Analyser',
  description: 'Investor lens · Product Feedback Analyser',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(!t||t==='dark')document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})()`,
          }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
        {children}
      </body>
    </html>
  )
}
