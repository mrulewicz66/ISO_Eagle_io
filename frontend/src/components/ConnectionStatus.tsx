'use client';

import { useRealtimeData } from '@/hooks/useRealtimeData';

export default function ConnectionStatus() {
    const { connected, data } = useRealtimeData();

    return (
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {connected ? 'Live' : 'Disconnected'}
            </span>
            {data?.timestamp && (
                <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    Last update: {new Date(data.timestamp).toLocaleTimeString()}
                </span>
            )}
        </div>
    );
}
