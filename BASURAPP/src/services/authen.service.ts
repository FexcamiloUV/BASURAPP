import firebase from "firebase/compat";

export class AutenticacionService {
    registrarUsuario(email: string, password: string){
        return firebase.auth().createUserWithEmailAndPassword(email, password);
    }
}