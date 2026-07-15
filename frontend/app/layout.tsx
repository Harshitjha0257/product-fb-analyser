import './globals.css'
import SplashWrapper from '@/components/SplashWrapper'

export const metadata = {
  title: 'FB Analyser — Investment Intelligence',
  description: 'Feedback Analyser + Company Analyser — Investment-grade AI analysis platform',
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
      <body className="bg-black text-white transition-colors duration-200">
        <SplashWrapper>{children}</SplashWrapper>
      </body>
    </html>
  )
}
