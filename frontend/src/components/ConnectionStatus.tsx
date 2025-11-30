'use client';

import Link from 'next/link';
import { useRealtimeData } from '@/hooks/useRealtimeData';

export default function ConnectionStatus() {
    const { connected, data } = useRealtimeData();

    return (
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                    {connected ? 'Live' : 'Offline'}
                </span>
                {data?.timestamp && (
                    <span className="hidden sm:inline text-xs text-zinc-500 dark:text-zinc-500">
                        Last update: {new Date(data.timestamp).toLocaleTimeString()}
                    </span>
                )}
            </div>
            <Link
                href="/changelog"
                className="text-[10px] sm:text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
                Changelog
            </Link>
        </div>
    );
}
