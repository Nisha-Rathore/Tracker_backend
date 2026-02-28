let io;

export const setSocketServer = (server) => {
  io = server;
};

export const getIO = () => io;