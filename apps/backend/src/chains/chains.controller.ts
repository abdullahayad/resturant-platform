import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ChainsService } from './chains.service';
import { CreateChainDto, UpdateChainDto } from './dto/chain.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

// Admin-only end to end - chains are never self-declared by a restaurant
// owner (see RestaurantChain's comment in schema.prisma for why).
@UseGuards(AdminAuthGuard)
@Controller('chains')
export class ChainsController {
  constructor(private readonly chains: ChainsService) {}

  @Get()
  list() {
    return this.chains.list();
  }

  @Post()
  create(@Body() dto: CreateChainDto) {
    return this.chains.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChainDto) {
    return this.chains.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.chains.remove(id);
  }
}
