import React from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, Image, AsyncStorage, AppState} from 'react-native';
import { Font } from 'expo';
import database from '../firebase/db';
import shuffledDeck from '../helpers/shuffledDeck';
import moment from 'moment';


export default class ChallengeModal extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      fontLoaded: false,
      newChallenger: false,
      friendsOnline: [],
      waitingForResponse: false,
      appState: false,
      rejected: false,
      accepted: false,
      countDown: 5
    }
    this.startCountdown = this.startCountdown.bind(this);
    this.clearCountdown = this.clearCountdown.bind(this);
  }

  async componentWillMount() {
    // this.grabOnlineFriends(this.props.fbId);
    await Font.loadAsync({
      'arcade': require('../assets/fonts/arcadeclassic.regular.ttf'),
    });
    this.setState({
      fontLoaded: true,
      isMounted: true,
      rejected: false,
    })
  }

  componentDidMount() {
    // this.startCountdown();
    this.getFriendInfo(this.props.friendId);
    this.listenForAccept(this.props.friendId);
    this.listenForCancel(this.props.friendId);
  }

  listenForAccept(friendId) {
    database.gameRooms.child(friendId).on('value', snap => {
      let friendResponse = snap.val();
      if (friendResponse.accepted === true && this.state.isMounted && this.state.accepted === false) {
        this.setState({accepted: true}, () => {
          this.startCountdown();
        });
      }
    })
  }

  listenForCancel(friendId) {
    database.gameRooms.child(friendId).on('value', snap => {
      let friendResponse = snap.val();
      if (friendResponse.requesting === false && this.state.isMounted) {
        this.clearCountdown();
        this.props.close();
      }
    })
  }


  tick() {
    this.setState({countDown: this.state.countDown - 1});
    if (this.state.countDown === 1) {
      //CREATE GAME ROOM
      let blitzDeck = shuffledDeck('blitz').slice()
      let timestamp = moment().format('MMMM Do YYYY, h:mm:ss a');
      let newGameRoom = database.blitzGame.push({
        deck: blitzDeck,
        playerOne: {
          fbId: this.props.fbId,
          score: 0,
          timestamp: timestamp,
          drawable: true
        },
        timestamp: timestamp
      })
      let roomKey = newGameRoom.key;
      database.gameRooms.child(this.props.friendId).child('blitzRoom').set(roomKey);
      database.gameRooms.child(this.props.fbId).child('blitzRoom').set(roomKey);
      this.setState({roomKey});

    }
    if (this.state.countDown <= 0) {
      this.clearCountdown();
      this.forceUnmount();
      this.props.close('startGame');
    }
  }


  startCountdown() {
    this.timer = setInterval(this.tick.bind(this), 1000);
  }

  clearCountdown() {
    clearInterval(this.timer);
  }

  getFriendInfo(friendId) {
    database.fbFriends.child(friendId).once('value', snap => {
      let friend = snap.val();
      this.setState({
        name: friend.name,
        fbPic: friend.fbPic,
        highscore: friend.highscore,
        waitingForResponse: true
      })
    })
  }

  cancelChallenge() {
    if (this.state.accepted === true) {
      this.resetRequestStatus();
    }
    this.clearCountdown();
    this.setState({
      isMounted: false
    }, () => {
      this.resetRequestStatus();
      this.props.close();
    });
  }

  resetRequestStatus() {
    if (this.props.friendId) {
      database.gameRooms.child(this.props.friendId).child('requesting').set(false);
      database.gameRooms.child(this.props.friendId).child('accepted').set(false);
    }
  }

  componentWillUnmount() {
    this.setState({
      isMounted: false,
      accepted: false,
      rejected: false,
      waitingForResponse: false
    }, () => console.log('unmounting..'))
  }

  forceUnmount() {
    this.setState({
      isMounted: false,
      accepted: false,
      rejected: false,
      waitingForResponse: false
    }, () => console.log('unmounting..'))
  }




  render() {
    return(
      this.state.fontLoaded ? (
        <View style={styles.box}>
          {this.state.rejected ? (
            <View style={[styles.box, {flex: 3}]}>
              <Text style={styles.font}>
                You were rejected...
              </Text>
            </View>
          ) : (null)}
          {this.state.accepted ? (
            <View style={[styles.box, {flex: 3}]}>
              <Text style={styles.font}>
                Game  starting in ...
              </Text>
              <Text style={[styles.font, {fontSize: 40}]}>
                {this.state.countDown}
              </Text>
            </View>
          ) : (null)}
          {!this.state.waitingForResponse ? (
            // !this.state.rejected ? (
            //   <View style={[styles.box, {flex: 3}]}>
            //     {this.state.friendsOnline.map((friend, i) => {
            //       let name = friend.name.slice(0, 10);
            //       let space = name.indexOf(' ');
            //       if (space > 0) { name = name.slice(0, space) };
            //       return (
            //         <View style={[styles.box, {flexDirection: 'row'}]} key={i}>
            //           <View style={styles.box}>
            //             <Image
            //               source={{uri: friend.profilePic}}
            //               style={{width: 40, height: 40, resizeMode: 'contain'}}
            //             />
            //           </View>
            //           <View style={styles.box}>
            //             <TouchableOpacity onPress={() => this.challengeFriend(friend)}>
            //               <Text style={styles.font}>
            //                 {name}
            //               </Text>
            //             </TouchableOpacity>
            //           </View>
            //         </View>
            //       )
            //     })}
            //   </View>
            // ) : (null)
            null
          ) : (
            <View style={[styles.box, {flex: 3}]}>
              <View style={styles.box}>
                <TouchableOpacity onPress={this.startCountdown.bind(this)}>
                  <Text style={styles.font}>
                    You are
                  </Text>
                </TouchableOpacity>
                <Text style={styles.font}>
                  challenging...
                </Text>
              </View>
              <View style={styles.box}>
                <Image
                  source={{uri: this.state.fbPic}}
                  style={{width: 50, height: 50, resizeMode: 'contain'}}
                />
              </View>
              <View style={styles.box}>
                <Text style={[styles.font, {fontSize: 20}]}>
                  {this.state.name.replace(/ /g, '  ')}
                </Text>
                <Text style={[styles.font, {fontSize: 20}]}>
                  highscore: {this.state.highscore}
                </Text>
              </View>
            </View>
          )}
          {this.state.rejected ? (
            <TouchableOpacity onPress={() => this.setState({rejected: false})} style={{flex: 1, alignItems: 'flex-end'}}>
              <Text style={styles.font}>
                Back to friends list
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => this.cancelChallenge()} style={{flex: 1, alignItems: 'flex-end'}}>
              <Text style={styles.font}>
                Back
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (null)
    )
  }
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    width: "100%"
  },
  font: {
    fontFamily: 'arcade',
    fontSize: 20,
    color: 'white'
  },
})
