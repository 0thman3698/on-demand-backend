import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GoogleProfile {
  id: string;
  emails?: Array<{ value: string; verified?: boolean }>;
  displayName?: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  photos?: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientID || !clientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be defined',
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      clientID,
      clientSecret,
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
  ): {
    email: string;
    name: string;
    picture?: string;
    googleId: string;
    provider: string;
  } {
    if (!profile || !profile.id) {
      throw new Error('Invalid Google profile');
    }

    const email =
      profile.emails && profile.emails.length > 0
        ? profile.emails[0].value
        : undefined;
    const name =
      profile.displayName ||
      (profile.name?.givenName && profile.name?.familyName
        ? `${profile.name.givenName} ${profile.name.familyName}`
        : profile.name?.givenName) ||
      'User';
    const picture =
      profile.photos && profile.photos.length > 0
        ? profile.photos[0].value
        : undefined;
    const googleId = profile.id;

    if (!email) {
      throw new Error('Email is required from Google profile');
    }

    return {
      email,
      name,
      picture,
      googleId,
      provider: 'google',
    };
  }
}
