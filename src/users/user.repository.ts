import type {
    CreateUser,
    UpdateUser,
    User,
} from "./user.schema.js";

const users: User[] = [
    {
        id: 1,
        name: "John Doe",
        email: "john.doe@example.com"
    },
    {
        id: 2,
        name: "Jane Doe",
        email: "jane.doe@example.com"
    }
];

let nextId = 3;

export async function findAllUsers(): Promise<User[]> {
    return users;
}

export async function findUserById(id: number): Promise<User | undefined> {
    return users.find(user => user.id === id);
}