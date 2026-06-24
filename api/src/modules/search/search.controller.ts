import { Controller, Get, Query } from '@nestjs/common';
import type { UserSearchResult, TripSearchResult, SearchResults } from '@trailr/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PublicRead } from '../../common/decorators/public-read.decorator';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @PublicRead()
  @Get()
  all(
    @CurrentUser() viewerId: string | undefined,
    @Query() query: SearchQueryDto,
  ): Promise<SearchResults> {
    return this.search.all(viewerId ?? null, query.q, query.limit ?? 5);
  }

  @PublicRead()
  @Get('users')
  users(
    @CurrentUser() viewerId: string | undefined,
    @Query() query: SearchQueryDto,
  ): Promise<UserSearchResult[]> {
    return this.search.users(viewerId ?? null, query.q, query.limit ?? 20);
  }

  @PublicRead()
  @Get('trips')
  trips(
    @CurrentUser() viewerId: string | undefined,
    @Query() query: SearchQueryDto,
  ): Promise<TripSearchResult[]> {
    return this.search.trips(viewerId ?? null, query.q, query.limit ?? 20);
  }
}
