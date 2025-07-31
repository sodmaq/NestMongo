import { Role } from 'src/enums/roles.enum';
export const userSeedData = [
  {
    fullName: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    roles: Role.USER,
    isVerified: true,
  },
  {
    fullName: 'Jane Smith',
    email: 'jane@example.com',
    password: 'securepass456',
    roles: Role.USER,
    isVerified: true,
  },
  {
    fullName: 'Bob Johnson',
    email: 'bob@example.com',
    password: 'mypassword789',
    roles: Role.USER,
    isVerified: false,
  },
  {
    fullName: 'Alice Wilson',
    email: 'alice@example.com',
    password: 'alicepass101',
    roles: Role.USER,
    isVerified: true,
  },
];
