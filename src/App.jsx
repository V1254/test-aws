import React, { useEffect, useReducer } from "react";
import "./App.css";

// amplify imports
import { API, graphqlOperation } from "aws-amplify";
import { withAuthenticator, AmplifySignOut } from "@aws-amplify/ui-react";

// mutations.queries and subscriptions
import { listNotes as notesList } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
  updateNote as updateNoteMutation,
} from "./graphql/mutations";
import { v4 as uuid } from "uuid";

// Required to apply the default styling
import "@aws-amplify/ui/dist/style.css";

const OperationTypes = {
  ADD_NOTE: "add_notes",
  UPDATE_NOTE: "update_notes",
  DELETE_NOTE: "delete_notes",
  SET_NOTES: "set_notes",
  CLEAR_INPUTS: "clear_inputs",
  UPDATE_INPUT: "update_input",
  SET_ERRORED: "set_errored",
  REMOVE_ERRORED: "remove_errored",
};

const initialState = {
  name: "",
  description: "",
  notes: [],
  Updatable: {
    index: "",
    name: "",
    description: "",
  },
  errored: false,
  errorMsg: "",
};

const NotesReducer = (state, action) => {
  let result;
  switch (action.type) {
    case OperationTypes.ADD_NOTE:
      result = { ...state, notes: [...state.notes, action.note] };
      break;
    case OperationTypes.UPDATE_NOTE:
      result = {
        ...state,
        notes: state.notes.map((el) => (el.id === action.note.id ? action.note : el)),
      };
      break;
    case OperationTypes.DELETE_NOTE:
      result = {
        ...state,
        notes: state.notes.filter((el) => el.id !== action.note.id),
      };
      break;
    case OperationTypes.SET_NOTES:
      result = {
        ...state,
        notes: action.notes,
      };
      break;
    case OperationTypes.CLEAR_INPUTS:
      result = {
        ...initialState,
      };
      break;
    case OperationTypes.UPDATE_INPUT:
      result = {
        ...state,
        [action.key]: action.value,
      };
      break;
    case OperationTypes.UPDATE_UPDATABLES:
      result = {
        ...state,
        Updatable: {
          ...state.Updatable,
          [action.key]: action.value,
        },
      };
      break;
    case OperationTypes.SET_ERRORED:
      result = {
        ...state,
        errored: true,
        errorMsg: action.error,
      };
      break;
    case OperationTypes.REMOVE_ERRORED:
      result = {
        ...state,
        errored: false,
        errorMsg: "",
      };
      break;
    default:
      result = state;
  }
  return result;
};

const allNotEmpty = (...values) => values.every((el) => !!el);

function App() {
  const [state, dispatch] = useReducer(NotesReducer, initialState);

  // Fetch the data effect
  useEffect(() => {
    fetchData();
  }, []);

  // Set up the subcriptions
  const fetchData = async () => {
    const apiData = await API.graphql(graphqlOperation(notesList));
    dispatch({ type: OperationTypes.SET_NOTES, notes: apiData?.data?.listNotes?.items });
  };

  // on change handler
  const onChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("Updatable")) {
      return dispatch({
        type: OperationTypes.UPDATE_UPDATABLES,
        key: name.split(".")[1],
        value: value,
      });
    }
    dispatch({ type: OperationTypes.UPDATE_INPUT, key: name, value: value });
  };

  const createNote = async () => {
    const { name, description } = state;
    if (!allNotEmpty(name, description)) {
      dispatch({
        type: OperationTypes.SET_ERRORED,
        error: `Failed validation for input fields, name: ${name}, description: ${description}`,
      });
      return;
    }

    const note = { id: uuid(), name, description };
    const notes = [...state.notes, note];

    // reset our form values
    dispatch({
      type: OperationTypes.CLEAR_INPUTS,
    });

    // update our talks
    dispatch({ type: OperationTypes.SET_NOTES, notes });

    // create our item with the graphql api
    try {
      const result = await API.graphql(graphqlOperation(createNoteMutation, { input: note }));
      console.log(`Item created:`, result);
    } catch (e) {
      dispatch({
        type: OperationTypes.SET_ERRORED,
        error: `Failed creating item with err: ${e}`,
      });
    }
  };

  const deleteNote = async ({ id }) => {
    const newNotes = state.notes.filter((n) => n.id !== id);
    dispatch({ type: OperationTypes.SET_NOTES, notes: newNotes });
    await API.graphql(graphqlOperation(deleteNoteMutation, { input: { id } }));
  };

  const updateNote = async () => {
    const { index, name: newName, description: newDescription } = state.Updatable;

    if (!allNotEmpty(index, newName, newDescription)) {
      dispatch({
        type: OperationTypes.SET_ERRORED,
        error: `Failed validation for updating: received: ${index}, ${newName}, ${newDescription}`,
      });
      return;
    }

    const foundNote = state.notes.find((note, idx) => parseInt(index) === idx);

    if (!foundNote) {
      dispatch({
        type: OperationTypes.SET_ERRORED,
        error: `Failed finding note with index ${index}`,
      });
      return;
    }

    if (!foundNote.id) {
      // if this is null we need to the get the id of this post.
    }

    const note = { id: foundNote.id, name: newName, description: newDescription };

    console.log(`dispatching note update for: `, note);
    // first update our notes with the new note
    dispatch({ type: OperationTypes.UPDATE_NOTE, note });

    // now update our api
    await API.graphql(graphqlOperation(updateNoteMutation, { input: note }));
  };

  const emptyContent = <h2>No Notes Found</h2>;

  const mapNotes = () => {
    return state.notes.map((note, idx) => (
      <div key={note.id || note.name}>
        <h2>{`Note: ${note.name}`}</h2>
        <p>{`Note Description: ${note.description}`}</p>
        <p>{`Note Id: ${idx}`}</p>
        <button onClick={() => deleteNote(note)}>Delete note</button>
      </div>
    ));
  };

  return (
    <div className="App">
      <h1>My Notes App</h1>
      <div className="Create-Note">
        <input onChange={onChange} placeholder="Note name" name="name" value={state.name} />
        <input
          onChange={onChange}
          placeholder="Note description"
          name="description"
          value={state.description}
        />
        <button onClick={createNote}>Create Note</button>
      </div>
      {state.notes.length ? (
        <div className="Update-Note">
          <input
            onChange={onChange}
            placeholder="Note Id"
            name="Updatable.index"
            value={state.Updatable.index}
          />
          <input
            onChange={onChange}
            placeholder="New Name"
            name="Updatable.name"
            value={state.Updatable.name}
          />
          <input
            onChange={onChange}
            placeholder="Note description"
            name="Updatable.description"
            value={state.Updatable.description}
          />
          <button onClick={updateNote}>Update Note</button>
        </div>
      ) : null}

      <p className={state.errored ? "App-Error" : null} style={{ color: "red" }}>
        {" "}
        {state.errored ? state.errorMsg : null}{" "}
      </p>
      <div style={{ marginTop: 30 }}>{state.notes.length ? mapNotes() : emptyContent}</div>
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);
