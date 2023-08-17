# Antiques

Antiques is a program that can be hosted on the IC protocol to handle various user requests as defined by the endpoints implemented on the antiques canister.

The canister can be tested locally as defined in the instructions below.

## :package: Built With

    - azle
    - dfx
    - typescript
    - Ic protocol
    - node

## :computer: Getting Started

    To get a local copy up and running follow these simple steps.

## :arrow_heading_down: Install

1. Clone the repository to your local machine

```sh
$ git clone git@github.com:kiberuJ/Antiques.git
```

2. cd into the directory

```sh
$ cd Antiques
```

3. install dependencies

```sh
npm install
```

Initialize the local Internet Computer

```sh
dfx start --background
```

Register, build, and deploy canister on the local Internet Computer

```sh
dfx deploy
```

## :arrow_forward: Usage

After successful deployement on the local Internet Computer, one can be able to interact with the canister using the terminal by invoking `dfx call methodName(params)`` commands or through the provided candid interface.

## :busts_in_silhouette: Authors

👤 **Jane Kiberu**

- Github: [@KiberuJ](https://github.com/kiberuJ)

## 🤝 Contributing

    Contributions, issues and feature requests are welcome!

Feel free to check the [issues page](../../issues).

## :star2: Show your support

    Give a ⭐️ if you like this project!
