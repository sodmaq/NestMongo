import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/enums/roles.enum';
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
      throw new ForbiddenException('Access denied: No user found on request');
    }

    const hasRole = requiredRoles.some((role) =>
      user.roles?.some(
        (userRole) => userRole.toLowerCase() === role.toLowerCase(),
      ),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        'Access denied: you do not have access to this resource',
      );
    }

    return true;
  }
}
