import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { Provider, ProviderSchema } from './schemas/provider.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Service, ServiceSchema } from '../services/schemas/service.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Provider.name, schema: ProviderSchema },
      { name: User.name, schema: UserSchema },
      { name: Service.name, schema: ServiceSchema },
    ]),
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
