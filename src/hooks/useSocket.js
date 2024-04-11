import { io } from 'socket.io-client';
import {useEffect, useState} from "react";
const HOST = 'http://192.168.1.45:65432';
function initEventSocket(socket) {
  socket.on('connect', async () => {
    console.info(`socket connected`);
  });

  socket.on('disconnect', () => {
    console.info(`socket disconnected`);
  });

  socket.on('connect_error', (error) => {
    console.info(`socket connect_error: error:${error}`);
  });
}
export async function initSocket() {
  // @ts-ignore
  const socket = io.connect(HOST);

  initEventSocket(socket);

  return socket;
}


export const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!socket) {
      const initializeSocket = async () => {
        const _socket = await initSocket({});
        setSocket(_socket);
      };
      initializeSocket();
    }
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);


  return {
    socket,
  }
};
