import React, { createContext, useState, useRef, useEffect } from 'react';

import { io } from 'socket.io-client';

import Peer from 'simple-peer';

const SocketContext = createContext();


const socket = io('http://localhost:5000');

const ContextProvider = ({ children }) => {
    const [stream, setStream] = useState(null);
    const [me, setMe] = useState('');
    const [name, setName] = useState('');
    const [call, setCall] = useState({})
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentStream) => {
                setStream(currentStream);

                myVideo.current.srcObject = currentStream;
            })

        socket.on('me', (id) => setMe(id));

        socket.on('calluser', ({ from, name: callername, signal }) => {
            setCall({ isRecievedCall: true, from, name: callername, signal });
        })
    }, []);

    const answerCall = () => {
        setCallAccepted(true);

        const peer = new Peer({ initiator: false, trickle: false, stream });

        peer.on('signal', (data) => {
            socket.emit('answercall', { signal: data, to: call.from })
        })

        peer.on('stream', (currentStream) => {
            userVideo.current.srcObject = currentStream;
        })

        peer.signal(call.signal);

        connectionRef.current = peer;
    }

    const callUser = (id) => {
        //initiator is true this time as we are making the call
        const peer = new Peer({ initiator: true, trickle: false, stream });

        peer.on('signal', (data) => {
            socket.emit('calluser', { userToCall: id, signalData: data, from: me, name })
        })

        peer.on('stream', (currentStream) => {
            userVideo.current.srcObject = currentStream;
        })

        socket.on('callaccepted', (signal) => {
            setCallAccepted(true);

            peer.signal(signal);
        })

        connectionRef.current = peer;

    }

    const leaveCall = () => {
        setCallEnded(true);
        connectionRef.current.destroy();

        window.location.reload();
    }


    return (
        <SocketContext.Provider value={{
            call, callAccepted, myVideo, userVideo, me, stream, setMe, name, setName, callEnded, callUser, leaveCall, answerCall
        }}>
            {children}
        </SocketContext.Provider>
    )
}

export { SocketContext, ContextProvider };