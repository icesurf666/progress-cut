import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  dialog: vi.fn(),
  isLoading: vi.fn(),
  once: vi.fn(),
}));
vi.mock('../src/main/sessionManifest.js', () => ({ findRecoverableSessions: mocks.list }));
vi.mock('electron', () => ({
  dialog: { showMessageBox: mocks.dialog },
  BrowserWindow: class {
    webContents = { isLoading: mocks.isLoading, once: mocks.once };
  },
}));
import { BrowserWindow } from 'electron';
import { offerSessionRecovery } from '../src/main/recovery/offerSessionRecovery.js';

const first = { outputDir: '/first', framesDir: '/first/frames', targetMs: 3000, frameCount: 3 };
const second = { ...first, outputDir: '/second', framesDir: '/second/frames' };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.list.mockResolvedValue([first, second]);
  mocks.isLoading.mockReturnValue(false);
});

it('keeps skipped sessions and recovers only the selected one', async () => {
  mocks.dialog.mockResolvedValueOnce({ response: 1 }).mockResolvedValueOnce({ response: 0 });
  const recover = vi.fn();
  await offerSessionRecovery(new BrowserWindow(), recover);
  expect(mocks.dialog).toHaveBeenCalledTimes(2);
  expect(recover.mock.calls).toEqual([[second]]);
  expect(mocks.dialog.mock.calls[0]?.[1]).toMatchObject({
    cancelId: 1,
    defaultId: 0,
    buttons: ['Recover story', 'Keep frames'],
    detail: expect.stringContaining('/first'),
  });
});

it('stops offering other sessions once recovery starts', async () => {
  mocks.dialog.mockResolvedValue({ response: 0 });
  const recover = vi.fn();
  await offerSessionRecovery(new BrowserWindow(), recover);
  expect(recover.mock.calls).toEqual([[first]]);
  expect(mocks.dialog).toHaveBeenCalledTimes(1);
});

it('waits for the renderer to load before starting recovery', async () => {
  mocks.isLoading.mockReturnValue(true);
  mocks.dialog.mockResolvedValue({ response: 0 });
  let loaded: (() => void) | undefined;
  mocks.once.mockImplementation((_name: string, callback: () => void) => {
    loaded = callback;
  });
  const recover = vi.fn();
  const pending = offerSessionRecovery(new BrowserWindow(), recover);
  await vi.waitFor(() => expect(mocks.once).toHaveBeenCalled());
  expect(mocks.dialog).not.toHaveBeenCalled();
  loaded?.();
  await pending;
  expect(recover.mock.calls).toEqual([[first]]);
});

it('does not offer an empty list or hide lookup failures', async () => {
  mocks.list.mockResolvedValue([]);
  await offerSessionRecovery(new BrowserWindow(), vi.fn());
  expect(mocks.dialog).not.toHaveBeenCalled();
  mocks.list.mockRejectedValue(new Error('permission denied'));
  await expect(offerSessionRecovery(new BrowserWindow(), vi.fn())).rejects.toThrow(
    'permission denied',
  );
});
