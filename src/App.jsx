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
import {
  onCreateNote as onNoteCreation,
  onUpdateNote as onNoteUpdate,
  onDeleteNote as onNoteDelete,
} from "./graphql/subscriptions";

// our reducer and types
import { initialState ,NotesReducer, OperationTypes } from './store/index';

// utility functions
import { allNotEmpty } from './utils/utils'

// unique id generation
import { v4 as uuid } from "uuid";

const CLIENT_ID = uuid();


function App() {
  const [state, dispatch] = useReducer(NotesReducer, initialState);

  // Fetch the data effect
  useEffect(() => {
    fetchData();
  }, []);

  // setup the subscriptions
  useEffect(() => {
    let createSub, updateSub, deleteSub;

    createSub = API.graphql(graphqlOperation(onNoteCreation)).subscribe({
      next: (eventData) => {
        // get the note created
        const { onCreateNote: note } = eventData?.value?.data;
        if(note.clientId !== CLIENT_ID) {
          dispatch({
            type: OperationTypes.ADD_NOTE,
            note
          })
        }
      },
    });

    updateSub = API.graphql(graphqlOperation(onNoteUpdate)).subscribe({
      next: (eventData) => {
        const { onUpdateNote: note } = eventData?.value?.data;
        if (note.clientId !== CLIENT_ID) {
          // only update our list if we arent the ones creating it
          dispatch({
            type: OperationTypes.UPDATE_NOTE,
            note,
          });
        }
      },
    });

    // same principal as above
    deleteSub = API.graphql(graphqlOperation(onNoteDelete)).subscribe({
      next: (eventData) => {
        const { onDeleteNote: note } = eventData?.value?.data;
        if(note.clientId !== CLIENT_ID) {
          dispatch({
            type: OperationTypes.DELETE_NOTE,
            note
          })
        }
      },
    });

    // clean up after ourselves on unmount
    return () => {
      createSub.unsubscribe();
      updateSub.unsubscribe();
      deleteSub.unsubscribe();
    }

  },[]);

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

    const note = { id: uuid(), clientId: CLIENT_ID, name, description };
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
