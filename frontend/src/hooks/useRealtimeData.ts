'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RealtimeData {
    success: boolean;
    timestamp: string;
}

export function useRealtimeData() {
    const [data, setData] = useState<RealtimeData | null>(null);
    const [connected, setConnected] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        const newSocket = io(SOCKET_URL);

        newSocket.on('connect', () => {
            console.log('Connected to WebSocket');
            setConnected(true);
        });

        newSocket.on('data-update', (newData: RealtimeData) => {
            setData(newData);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
            setConnected(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const subscribe = (crypto: string) => {
        if (socket) {
            socket.emit('subscribe', crypto);
        }
    };

    const unsubscribe = (crypto: string) => {
        if (socket) {
            socket.emit('unsubscribe', crypto);
        }
    };

    return { data, connected, subscribe, unsubscribe };
}
