export async function connectInspector(url) {
  const socket = new globalThis.WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  socket.addEventListener('close', () => {
    for (const request of pending.values()) request.reject(new Error('Inspector disconnected'));
    pending.clear();
  });
  return {
    async evaluate(expression, awaitPromise = false) {
      const id = ++sequence;
      const result = await new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(
          JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: {
              expression: `globalThis.__packagedSmokeResult = (${expression})`,
              awaitPromise,
              returnByValue: true,
            },
          }),
        );
      });
      if (result.exceptionDetails)
        throw new Error(
          result.exceptionDetails.exception?.description ?? result.exceptionDetails.text,
        );
      return result.result.value;
    },
    close() {
      socket.close();
    },
  };
}
