import { InfoCheckService } from './info-check.service';

describe('InfoCheckService', () => {
  const restaurant = { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
  const push = { sendToRestaurants: jest.fn() };
  const log = { log: jest.fn() };
  const service = new InfoCheckService({ db: { restaurant } } as never, push as never, log as never);
  const now = new Date('2026-11-25T10:00:00Z'); // 13:00 in Baghdad
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const live = { status: 'APPROVED', publishStatus: 'APPROVED', createdAt: daysAgo(200) };

  beforeEach(() => jest.resetAllMocks());

  it('is due 30 days after the last confirmation, else after the publish review', async () => {
    restaurant.findUnique.mockResolvedValueOnce({
      ...live,
      infoConfirmedAt: daysAgo(31),
      publishReviewedAt: daysAgo(90),
    });
    expect((await service.status('r1', now)).due).toBe(true);
    restaurant.findUnique.mockResolvedValueOnce({
      ...live,
      infoConfirmedAt: daysAgo(5),
      publishReviewedAt: daysAgo(90),
    });
    expect((await service.status('r1', now)).due).toBe(false);
    restaurant.findUnique.mockResolvedValueOnce({ ...live, infoConfirmedAt: null, publishReviewedAt: daysAgo(10) });
    expect((await service.status('r1', now)).due).toBe(false);
  });

  it('never asks a restaurant that is not published', async () => {
    restaurant.findUnique.mockResolvedValueOnce({
      ...live,
      publishStatus: 'PENDING',
      infoConfirmedAt: null,
      publishReviewedAt: null,
    });
    expect((await service.status('r1', now)).due).toBe(false);
  });

  it('only pushes to the restaurants it managed to claim', async () => {
    restaurant.findMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
    restaurant.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    expect(await service.sendReminders(now)).toBe(1);
    expect(push.sendToRestaurants).toHaveBeenCalledTimes(1);
    expect((push.sendToRestaurants.mock.calls[0] as unknown[])[0]).toEqual(['a']);
  });

  it('stays quiet at night', async () => {
    expect(await service.sendReminders(new Date('2026-11-25T20:00:00Z'))).toBe(0);
    expect(restaurant.findMany).not.toHaveBeenCalled();
  });

  it('records the confirmation', async () => {
    await service.confirm({ sub: 'r1' } as never, now);
    expect(restaurant.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { infoConfirmedAt: now } });
    expect(log.log).toHaveBeenCalled();
  });
});
