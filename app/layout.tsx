// Next.js
import type { Metadata } from 'next';

// Next.js - Google Fonts
import { Noto_Sans_JP } from 'next/font/google';

// Next.js - Themes
import { ThemeProvider } from 'next-themes';

// Styles
import '@/app/globals.css';

/**
 * メタデータ
 */
export const metadata: Metadata = {
  title: {
    default: 'ChipTube',
    template: '%s - ChipTube',
  },
  description:
    'Enjoy the tunes you love, upload original MIDI, and share it all with friends, family, and the world on ChipTube.',
};

/**
 * Noto Sans JP
 */
const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
});

/**
 * ルートレイアウト
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={notoSansJp.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
