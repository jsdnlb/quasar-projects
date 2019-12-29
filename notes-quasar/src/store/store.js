import Vue from "vue";
import { firebaseAuth, firebaseDB } from "boot/firebase";
import { Notify } from "quasar";
const state = {
  userDetails: {},
  users: {}
};

const mutations = {
  setUserDetails(state, payload) {
    state.userDetails = payload;
  },
  addUser(state, payload) {
    Vue.set(state.users, payload.userId, payload.userDetails);
  },
  updateUser(state, payload) {
    Object.assign(state.users[payload.userId], payload.userDetails);
  }
};

const actions = {
  registerUser({}, payload) {
    firebaseAuth
      .createUserWithEmailAndPassword(payload.email, payload.password)
      .then(response => {
        console.log(response);
        let userId = firebaseAuth.currentUser.uid;
        firebaseDB.ref("users/" + userId).set({
          name: payload.name,
          email: payload.email,
          online: true
        });
      })
      .catch(error => {
        console.log(error.message);
        Notify.create({
          position: "top",
          message: "Por favor verifica tu correo o tu contraseña",
          color: "warning",
          icon: "error_outline"
        });
      });
  },
  loginUser({}, payload) {
    firebaseAuth
      .signInWithEmailAndPassword(payload.email, payload.password)
      .then(response => {
        console.log(response);
        /*  let userId = firebaseAuth.currentUser.uid;
        firebaseDB.ref("users/" + userId).set({
          name: payload.name,
          email: payload.email,
          online: true
        }); */
      })
      .catch(error => {
        console.log("Error al ingresar", error.message);
        Notify.create({
          position: "top",
          message: "Por favor verifica tu correo electrónico o tu contraseña",
          color: "warning",
          icon: "error_outline"
        });
      });
  },
  logoutUser({ commit, dispatch }) {
    firebaseAuth.signOut();
    dispatch("firebaseUpdateUser", {
      userId: state.userDetails.userId,
      updates: {
        online: false
      }
    });
    commit("setUserDetails", {});
  },
  handleAuthStateChanged({ commit, dispatch }) {
    firebaseAuth.onAuthStateChanged(user => {
      if (user) {
        let userId = firebaseAuth.currentUser.uid;
        firebaseDB.ref("users/" + userId).once("value", snapshot => {
          let userDetails = snapshot.val();
          commit("setUserDetails", {
            name: userDetails.name,
            email: userDetails.email,
            userId: userId
          });
        });
        dispatch("firebaseUpdateUser", {
          userId: userId,
          updates: {
            online: true
          }
        });
        dispatch("firebaseGetUsers");
        this.$router.push("/notes");
      } else {
        if (this.$router.currentRoute.fullPath !== "/auth") {
          this.$router.push("/auth");
        }
      }
    });
  },

  firebaseUpdateUser({}, payload) {
    firebaseDB.ref("users/" + payload.userId).update(payload.updates);
  },
  firebaseGetUsers({ commit }) {
    firebaseDB.ref("users").on("child_added", snapshot => {
      let userDetails = snapshot.val();
      let userId = snapshot.key;
      commit("addUser", {
        userId,
        userDetails
      });
    });
    firebaseDB.ref("users").on("child_changed", snapshot => {
      let userDetails = snapshot.val();
      let userId = snapshot.key;
      commit("updateUser", {
        userId,
        userDetails
      });
    });
  }
};

const getters = {
  users: state => {
    let usersFiltered = {};
    Object.keys(state.users).forEach(key => {
      if (key !== state.userDetails.userId) {
        usersFiltered[key] = state.users[key];
      }
    });
    return usersFiltered;
  }
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};