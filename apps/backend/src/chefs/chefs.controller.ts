import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Put, Req, UseGuards } from '@nestjs/common';
import { ChefsService } from './chefs.service';
import { UpsertChefProfileDto } from './dto/chef-profile.dto';
import { UpdateCrewDto } from './dto/crew.dto';
import { PartnerAuthGuard } from '../auth/guards/partner-auth.guard';
import { ApprovedPartnerGuard } from '../auth/guards/approved-partner.guard';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

const ROLE_SLUGS = { chef: 'HEAD_CHEF', 'sous-chef': 'SOUS_CHEF' } as const;
type RoleSlug = keyof typeof ROLE_SLUGS;

function resolveRole(slug: string) {
  const role = ROLE_SLUGS[slug as RoleSlug];
  if (!role) throw new BadRequestException('role must be "chef" or "sous-chef"');
  return role;
}

@Controller('restaurants/me/chefs')
export class ChefsController {
  constructor(private readonly chefs: ChefsService) {}

  @UseGuards(PartnerAuthGuard)
  @Get()
  get(@Req() req: { user: PartnerJwtPayload }) {
    return this.chefs.get(req.user.sub);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Put(':role')
  upsert(
    @Req() req: { user: PartnerJwtPayload },
    @Param('role') role: string,
    @Body() dto: UpsertChefProfileDto,
  ) {
    return this.chefs.upsertProfile(req.user.sub, resolveRole(role), dto);
  }

  @UseGuards(ApprovedPartnerGuard)
  @Delete(':role')
  remove(@Req() req: { user: PartnerJwtPayload }, @Param('role') role: string) {
    return this.chefs.removeProfile(req.user.sub, resolveRole(role));
  }

  @UseGuards(ApprovedPartnerGuard)
  @Patch('crew')
  updateCrew(@Req() req: { user: PartnerJwtPayload }, @Body() dto: UpdateCrewDto) {
    return this.chefs.updateCrew(req.user.sub, dto);
  }
}
