import { OperationTypes } from "./types";
import { InitialState as initialState } from "./state";
import { updateObject } from "../utils/utils";

export const NotesReducer = (state, action) => {
  switch (action.type) {
    case OperationTypes.ADD_NOTE:
      return updateObject(state, {
        notes: [...state.notes, action.note],
      });

    case OperationTypes.UPDATE_NOTE:
      return updateObject(state, {
        notes: state.notes.map((el) => (el.id === action.note.id ? action.note : el)),
      });

    case OperationTypes.DELETE_NOTE:
      return updateObject(state, {
        notes: state.notes.filter((el) => el.id !== action.note.id),
      });

    case OperationTypes.SET_NOTES:
      return updateObject(state, { notes: action.notes });

    case OperationTypes.CLEAR_INPUTS:
      return {
        ...initialState,
      };

    case OperationTypes.UPDATE_INPUT:
      return updateObject(state, {
        [action.key]: action.value,
      });

    case OperationTypes.UPDATE_UPDATABLES:
      return {
        ...state,
        Updatable: {
          ...state.Updatable,
          [action.key]: action.value,
        },
      };

    case OperationTypes.SET_ERRORED:
      return updateObject(state, {
        errored: true,
        errorMsg: action.error,
      });

    case OperationTypes.REMOVE_ERRORED:
      return updateObject(state, {
        errored: false,
        errorMsg: "",
      });
    default:
      return state;
  }
};
