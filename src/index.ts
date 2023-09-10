import {
    $query,
    $update,
    Record,
    StableBTreeMap,
    Vec,
    match,
    Result,
    nat64,
    ic,
    Opt,
  } from "azle";
  import { v4 as uuidv4 } from "uuid";
  
  type User = Record<{
    id: string;
    username: string;
    antiquesIds: Vec<string>; 
    createdAt: nat64;
  }>;
  
  type Antique = Record<{
    id: string;
    title: string;
    body: string;
    attachmentURL: string;
    userId: string;
    createdAt: nat64;
  }>;

  type Favorite = Record<{
    id: string;
    userId: string;
    antiqueId: string;
    createdAt: nat64;
}>;
  
  type UserPayload = Record<{
    username: string;
  }>;
  
  type AntiquePayload = Record<{
    title: string;
    body: string;
    attachmentURL: string;
    userId: string;
  }>;

  type FavoritePayload = Record<{
    userId: string;
    antiqueId: string;
}>;
  
  const users = new StableBTreeMap<string, User>(0, 44, 1024);
  const antiques = new StableBTreeMap<string, Antique>(1, 44, 20000);
  const favorites = new StableBTreeMap<string, Favorite>(2, 50, 30000);
  
  $update;
  export function createUser(payload: UserPayload): User {
    const existingUser = users
      .values()
      .find((u) => u.username === payload.username);
    if (existingUser) {
      throw new Error("Username already exists");
    }
    if (!payload.username) {
      throw new Error("Username is required.");
    }
    try {
      const user: User = {
        id: uuidv4(),
        createdAt: ic.time(),
        antiquesIds: [],
        ...payload,
      };
      users.insert(user.id, user);
      return user;
    } catch (error) {
      console.error("An unexpected error occurred:", error);
      throw error;
    }
  }
  
  $query;
  export function getUsers(): Result<Vec<User>, string> {
    try {
      return Result.Ok(users.values());
    } catch (error) {
      return Result.Err(`Failed to fetch users: ${error}`);
    }
  }
  
  $query;
  export function getUser(id: string): Result<User, string> {
    try {
      const user = users.get(id);
      return match(user, {
        Some: (user) => Result.Ok<User, string>(user),
        None: () =>
          Result.Err<User, string>(`Couldn't find user with the id: ${id}`),
      });
    } catch (error) {
      return Result.Err<User, string>(
        `Error accessing 'users' data structure: ${error}`
      );
    }
  }
  
  $update;
  export function deleteUser(id: string): Result<User, string> {
    return match(users.remove(id), {
      Some: (deletedUser) => {
        // Remove antiques of the associated user
        deletedUser.antiquesIds.forEach((antiqueId) => {
          antiques.remove(antiqueId);
        });
        return Result.Ok<User, string>(deletedUser);
      },
      None: () =>
        Result.Err<User, string>(`Couldn't delete a user with the specified id`),
    });
  }
  
  $update;
  export function addAntique(payload: AntiquePayload): Result<Antique, string> {
    try {
      // Validate the payload
      if (
        !payload.title ||
        !payload.body ||
        !payload.attachmentURL ||
        !payload.userId
      ) {
        return Result.Err<Antique, string>(
          "Invalid payload. Missing required fields"
        );
      }
  
      const user = users.get(payload.userId);
      return match(user, {
        Some: (user) => {
          const antique: Antique = {
            id: uuidv4(),
            createdAt: ic.time(),
            ...payload,
          };
          antiques.insert(antique.id, antique);
  
          // Update user's antiqueIds filed to reflect the added antique
          const updatedUser: User = {
            ...user,
            antiquesIds: [...user.antiquesIds, antique.id],
          };
          users.insert(updatedUser.id, updatedUser);
  
          return Result.Ok<Antique, string>(antique);
        },
        None: () =>
          Result.Err<Antique, string>(
            `Couldn't add the antique. The user id provided does not exist`
          ),
      });
    } catch (error) {
      return Result.Err<Antique, string>(
        `An error occurred while adding the antique: ${error}`
      );
    }
  }
  
  $query;
  export function getAntiques(): Result<Vec<Antique>, string> {
    try {
      return Result.Ok(antiques.values());
    } catch (error) {
      return Result.Err(`Failed to fetch antiques: ${error}`);
    }
  }
  
  $query;
  export function getAntique(id: string): Result<Antique, string> {
    const antique = antiques.get(id);
    return match(antique, {
      Some: (antique) => Result.Ok<Antique, string>(antique),
      None: () =>
        Result.Err<Antique, string>(`Couldn't find antique with id: ${id}`),
    });
  }
  
  $update;
  export function removeAntique(id: string): Result<Antique, string> {
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
              ),
            };
            users.insert(updatedUser.id, updatedUser);
  
            return Result.Ok<Antique, string>(antique);
          },
          None: () =>
            Result.Err<Antique, string>(
              `Cannot get user who created the Antique!`
            ),
        });
      },
      None: () =>
        Result.Err<Antique, string>(`Cannot delete the specified antique!`),
    });
  }

  $update;
export function addToFavorite(payload: FavoritePayload): Opt<Favorite> {
    // validate input fields
    const { userId, antiqueId } = payload;
    if(!userId || !antiqueId) {
        throw new Error(`Invalid input fields`);
    }

    // Validate user and antique existing records
    const user = users.containsKey(userId);
    const antique = antiques.containsKey(antiqueId);
    if(!antique || !user) {
        throw new Error("user or doctor with the given Id does not exist");
    }

    // Check for existing favorite
    const checkFavorite = favorites.values().find(
        (
            favorite => favorite.userId === userId && favorite.antiqueId === antiqueId
            ));
    // Remove favorite if already favorited for the purpose of frontend
    if (checkFavorite) {
      return removeFavorite(checkFavorite.id);
    } else {
        // Create new favorite record
        try {
          const favorite: Favorite = {
              id: uuidv4(),
              userId,
              antiqueId,
              createdAt: ic.time()
          }
          return favorites.insert(favorite.id, favorite);
      }
      catch(err) {
          throw new Error(`Couldn't add to favorite! ${err}`);
      }
    }
}

$query;
export function getUserFavorites(id: string): Vec<Favorite> {
    // Validate input field
    if(!id) {
        throw new Error(`Invalid id input field!`);
    }

    // Get the user favorites 
    try {
        return favorites.values().filter((fav => fav.userId === id));
    } catch(err) {
        throw new Error(`Couldn't find users favorites ${err}`);
    }
}

function removeFavorite(id: string): Opt<Favorite> {
  try {
    return favorites.remove(id);
  } catch(err) {
    throw new Error(`Couldn't delete favorite record! ${err}`);
  }
}

  const secureCrypto = {
    getRandomValues: () => {
      let array = new Uint8Array(32);
  
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
  
      return array;
    },
  };
  //@ts-ignore
  globalThis.crypto = secureCrypto;
