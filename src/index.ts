import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt } from 'azle';
import { v4 as uuidv4 } from 'uuid';


type User = Record<{
    id: string;
    username: string;
    antiquesIds: Vec<string>;
    createdAt: nat64;
}>

type Antique = Record<{
    id: string;
    title: string;
    body: string;
    attachmentURL: string;
    userId: string;
    createdAt: nat64;
}>

type UserPayload = Record<{
    username: string;
}>

type AntiquePayload = Record<{
    title: string;
    body: string;
    attachmentURL: string;
    userId: string;
}>

const users = new StableBTreeMap<string, User>(0, 44, 1024);
const antiques = new StableBTreeMap<string, Antique>(1, 44, 20000);

$update;
export function createUser(payload: UserPayload): User {
    const user: User = { 
        id: uuidv4(), 
        createdAt: ic.time(), 
        antiquesIds: [],
        ...payload
    };
    users.insert(user.id, user);
    return user;
}

$query;
export function getUsers(): Vec<User> {
    return users.values();
}

$query
export function getUser(id: string): Opt<User> {
    return users.get(id);
}

$update;
export function deleteUser(id: string): Result< User, string> {
    let user = users.get(id);
    return match(users.remove(id), {
        Some: (deletedUser) => Result.Ok<User, string>(deletedUser),
        None: () => Result.Err<User, string>(`Couldn't delete a user with the specidied id`)
    });
}

$update;
export function addAntique(payload: AntiquePayload): Result<Antique, string> {
    const user = users.get(payload.userId);
    return match(user, {
        Some: (user) => {
            const antique: Antique = {
                id: uuidv4(),
                createdAt: ic.time(),
                ...payload
            };
            antiques.insert(antique.id, antique);
            const updatedUser: User = {
                ...user,
                antiquesIds: [...user.antiquesIds, antique.id]
            }
            users.insert(updatedUser.id, updatedUser);

            return Result.Ok<Antique, string>(antique);
        },
        None: () => Result.Err<Antique, string>(`Couldn't find a user with the specidied id`)
    });
}

$query;
export function getAntiques(): Vec<Antique> {
    return antiques.values();
}

$query;
export function getAntique(id: string): Opt<Antique> {
    return antiques.get(id);
}

$update;
export function removeAntique(id: string): Result<Antique, string>{
    const antique = antiques.get(id);

    return match(antique, {
      Some: (antique) => {
        const user = users.get(antique.userId);
        
        // Remove antique to be deleted from antiquesIds vector of the user record
        return match(user, {
            Some: (user) => {
                const updatedUser: User = {
                    ...user,
                    antiquesIds: user.antiquesIds.filter(
                        (antiqueId) => antiqueId !== antique.id
                    )
                };
                users.insert(updatedUser.id, updatedUser);
                antiques.remove(id);
                return Result.Ok<Antique, string>(antique)
            },
            None: () => Result.Err<Antique, string>(`Cannot get user who created the Antique!`)
        });
      },
      None: () => Result.Err<Antique, string>(`Cannot delete the specified antique!`)
    });
}

globalThis.crypto = {
    getRandomValues: () => {
    let array = new Uint8Array(32);
    for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
    }
    return array;
}
}


