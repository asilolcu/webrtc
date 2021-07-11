import React, { Component } from "react";
import io from 'socket.io-client'

class App extends Component {
  constructor(props) {
    super(props)

    this.localVideoref = React.createRef()
    this.remoteVideoref = React.createRef()

    this.socket = null
    this.candidates = []
  }

  componentDidMount() {

    this.socket = io(
      '/webrtcPeer',
      {
        path: '/io/webrtc',
        query: {}
      }
    )

    this.socket.on('connection-success', success => {
      console.log(success)
    })

    this.socket.on('offerOrAnswer', (sdp) => {
      this.textref.value = JSON.stringify(sdp)

      // set sdp as remote description
      this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
    })

    this.socket.on('candidate', (candidate) => {
      // console.log('From Peer... ', JSON.stringify(candidate))
      // this.candidates = [...this.candidates, candidate]
      this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    })

    //const pc_config = null

    const pc_config = {
      "iceServers": [
        //     {
        //       urls: 'stun:[STUN_IP]:[PORT]',
        //       'credentials': '[YOR CREDENTIALS]',
        //       'username': '[USERNAME]'
        //     }
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    }

    this.pc = new RTCPeerConnection(pc_config)

    this.pc.onicecandidate = (e) => {
      if (e.candidate) this.sendToPeer('candidate', e.candidate)
    }

    this.pc.oniceconnectionstatechange = (e) => {
      console.log(e)
    }

    this.pc.ontrack = (e) => {
      this.remoteVideoref.current.srcObject = e.streams[0]
    }

    const constraints = {
      audio: true,
      video: {
        aspectRatio: { ideal: 16 / 9 },

      }
    }

    const success = (stream) => {
      window.localStream = stream
      this.localVideoref.current.srcObject = stream
      // this.pc.addStream(stream)
      stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
    }

    const failure = (e) => {
      console.log('getUserMedia Error: ', e)
    }

    navigator.mediaDevices.getUserMedia(constraints, success, failure)
      .then(success)
      .catch(failure)
  }

  sendToPeer = (messageType, payload) => {
    this.socket.emit(messageType, {
      socketID: this.socket.id,
      payload
    })
  }

  /* ACTION METHODS FROM THE BUTTONS ON SCREEN */

  createOffer = () => {
    console.log('Offer')
    this.pc.createOffer({ offerToReceiveVideo: 1 })
      .then(sdp => {
        this.pc.setLocalDescription(sdp)
        this.sendToPeer('offerOrAnswer', sdp)
        console.log(sdp)
      }, e => { })
  }

  setRemoteDescription = () => {
    // retrieve and parse the SDP copied from the remote peer
    const desc = JSON.parse(this.textref.value)

    // set sdp as remote description
    this.pc.setRemoteDescription(new RTCSessionDescription(desc))
  }


  // creates an SDP answer to an offer received from remote peer
  createAnswer = () => {
    console.log('Answer')
    this.pc.createAnswer({ offerToReceiveVideo: 1 })
      .then(sdp => {
        console.log(JSON.stringify(sdp))

        this.pc.setLocalDescription(sdp)
        this.sendToPeer('offerOrAnswer', sdp)
      })
  }

  addCandidate = () => {
    // retrieve and parse the Candidate copied from the remote peer
    // const candidate = JSON.parse(this.textref.value)
    // console.log('Adding candidate:', candidate)

    // add the candidate to the peer connection
    this.candidates.forEach(candidate => {
      console.log(JSON.stringify(candidate))
      this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    });
  }

  render() {
    return (
      <div className='w-full'>
        <main>
          <div className='mx-auto p-40'>
            <div className='grid grid-cols-2 gap-8'>
              <div>
                <video
                  className='w-full h-full bg-black chatVideo'
                  ref={this.localVideoref}
                  autoPlay>
                </video>
              </div>
              <div>
                <video
                  className='w-full h-full bg-black chatVideo'
                  ref={this.localVideoref}
                  autoPlay>
                </video>
              </div>
            </div>

            <div className='mt-4'>
              <button className='bg-gray-700 rounded text-white p-1 w-24' onClick={this.createOffer} >
                Offer
              </button>

              <button className='bg-gray-700 rounded text-white p-1 h-full ml-2 w-24' onClick={this.createAnswer} >
                Answer
              </button>

              <textarea className='w-full mt-4 p-1 bg-gray-300 rounded text-gray-700 focus:ring-2 focus:ring-blue-600' ref={ref => { this.textref = ref }} />
            </div>

          </div>

          {/* <button onClick={this.setRemoteDescription}>Set Remote Desc</button>
        <button onClick={this.addCandidate}>Add Candidate</button> */}

        </main>
      </div>
    );
  }

}

export default App;
