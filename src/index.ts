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
        None: () => Result.Err<User, string>(`Couldn't delete a user with the specified id`)
    });
}

$update;
export function addAntique(payload: AntiquePayload): Result<Antique, string> {
    const user = users.get(payload.userId);
    
    if (!user) {
        return Result.Err<Antique, string>(`Couldn't find the user who created the antique`);
    }

    const antique: Antique = {
        id: uuidv4(),
        createdAt: ic.time(),
        ...payload
    };

    // Validate that the user ID provided in the payload is valid
    if (!isValidUserId(payload.userId)) {
        return Result.Err<Antique, string>(`Invalid user ID provided`);
    }

    // Insert the antique into the antiques map
    if (antiques.insert(antique.id, antique)) {
        const updatedUser: User = {
            ...user,
            antiquesIds: [...user.antiquesIds, antique.id]
        };
        users.insert(updatedUser.id, updatedUser);

        return Result.Ok<Antique, string>(antique);
    } else {
        return Result.Err<Antique, string>(`Failed to insert the antique`);
    }
}

function isValidUserId(userId: string): boolean {
    const user = users.get(userId);
    return !!user;
}


$query;
export function getAntiques(): Vec<Antique> {
    return antiques.values();
}

$query;
export function getAntique(id: string): Opt<Antique> {
  const antique = antiques.get(id);
  return match(antique, {
      Some: (antique) => Opt.Some<Antique>(antique),
      None: () => Opt.None<Antique>()
  });

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
              antiques.remove(id);
                const updatedUser: User = {
                    ...user,
                    antiquesIds: user.antiquesIds.filter(
                        (antiqueId) => antiqueId !== antique.id
                    )
                };
                users.insert(updatedUser.id, updatedUser);
                
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

