import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/enums/roles.enum';
import { pinoLogger } from 'src/middlewares/logger/pino-logger';
import { ROLES_KEY } from 'src/user/decorator/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      pinoLogger.error('RolesGuard: No user found on request');
      return false;
    }

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
