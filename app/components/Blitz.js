import React from 'react';
import { StyleSheet, Text, View, Button, PanResponder, Dimensions, Image, Animated, TouchableOpacity, AsyncStorage, AppState, ScrollView } from 'react-native';
import { Font } from 'expo';
import HexGrid from './HexGrid.js';
import Modal from 'react-native-modal';
import { adjacentTiles, keyTiles } from '../helpers/tileLogic';
import shuffledDeck from '../helpers/shuffledDeck';
import calculateScore from '../helpers/calculateScore';
import handAnimations from '../helpers/handAnimations';
import cardImages from '../helpers/cardImages';
import database from '../firebase/db';
import ChallengeModal from '../modals/ChallengeModal';
import HereComesANewChallengerModal from '../modals/HereComesANewChallengerModal';
import facebookTokenCheck from '../helpers/facebookTokenCheck';
import HowToPlayBlitz from '../modals/HowToPlayBlitz';


export default class Blitz extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      fbId: null,
      fontLoaded: false,
      challengeModal: false,
      hereComesANewChallenger: false,
      howToModal: false,
      totalscore: 0,
      highscore: 0,
      newChallenger: 0,
      appState: AppState.currentState,
      online: false,
      friendsOnline: [],
      isMounted: false,
      accepted: false
    }
  }


  async componentDidMount() {
    AppState.addEventListener('change', this._handleAppStateChange);
    facebookTokenCheck();
    let fbId = await AsyncStorage.getItem('fbId');
    this.grabOnlineFriends(fbId);
    await Font.loadAsync({
      'arcade': require('../assets/fonts/arcadeclassic.regular.ttf'),
    });
    this.setState({
      fontLoaded: true,
      fbId: fbId,
      isMounted: true
    }, () => {
      console.log(this.state.isMounted, 'on mount')
      this.listenForChallenges();
      this.resetRequestStatus();
      this.setOnlineStatus(true);
    })
  }

  grabOnlineFriends(fbId) {
    database.fbFriends.child(fbId).child('friends').once('value', snap => {
      let friends = snap.val()[0];
      friends.forEach((friend, i) => {
        database.gameRooms.child(friend.id).child('online').on('value', snap => {
          if (this.state.isMounted && !this.state.accepted) {
            if (snap.val() === true) {
              this.setState({
                friendsOnline: [...this.state.friendsOnline, friend]
              })
            } else {
              for(let i = 0; i < this.state.friendsOnline.length; i++) {
                if (this.state.friendsOnline[i].id === friend.id) {
                  let spliceIndex = i;
                  this.state.friendsOnline.splice(i, 1);
                  this.setState({friendsOnline: this.state.friendsOnline})
                  break;
                }
              }
            }
          }
        })
      })
    })
  }



  closeModal(type, roomKey) {
    this.setState({
      challengeModal: false,
      hereComesANewChallenger: false,
      howToModal: false,
      waitingForResponse: false,
      rejected: true,
      accepted: false,
    })

    if (type === 'cancelChallenge') {
      this.resetRequestStatus();
    } else if (type === 'startGame') {
      this.setState({
        isMounted: false
      }, () => {
        setTimeout(() => this.props.navigation.navigate('BlitzJoin'), 500)
      })
    }
  }

  async showModal(modal, challenger) {
    if (modal === 'challenge') {
      this.setState({
        challengeModal: true,
      })

    } else if (modal === "challengeRecieved") {
      setTimeout(() => {
        this.setState({
          hereComesANewChallenger: true,
          challenger: challenger
        })
      }, 450)
    } else if (modal === 'howToPlay') {
      this.setState({
        howToModal: true
      })
    }
  }

  goBack() {
    this.setState({isMounted: false}, () => {
      this.props.navigation.goBack();
    })
  }

  componentWillUnmount() {
    this.setOnlineStatus(false);
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  setOnlineStatus(bool) {
    if (this.state.fbId !== null) {
      database.gameRooms.child(this.state.fbId).child('online').set(bool);
      this.setState({online: bool})
    }
  }

  resetRequestStatus(friendId) {
    if (friendId) {
      database.gameRooms.child(friendId).child('requesting').set(false);
      database.gameRooms.child(friendId).child('accepted').set(false);
    } else {
      database.gameRooms.child(this.state.fbId).child('requesting').set(false);
      database.gameRooms.child(this.state.fbId).child('accepted').set(false);
    }
  }

  _handleAppStateChange = (nextAppState) => {
    if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('online true')
      this.setOnlineStatus(true);
    } else {
      this.setOnlineStatus(false);
      this.resetRequestStatus();
    }
    this.setState({appState: nextAppState});
  }

  listenForChallenges() {
    let ownRef = database.gameRooms.child(this.state.fbId);
    ownRef.on('value', data => {
      let challenger = data.val();
      if (typeof challenger.requesting === 'string' && this.state.isMounted && this.state.hereComesANewChallenger === false) {
        this.closeModal();
        this.showModal("challengeRecieved", challenger.requesting);
      }
    })
  }



  challengeFriend(friend) {
    let friendId = friend.id;
    this.setState({friendId});
    database.gameRooms.child(friendId).child('online').once('value', snap => {
      if(snap.val() === true) {
        database.gameRooms.child(friendId).child('requesting').set(this.state.fbId)
      }
    }).then(res => {
      this.getFriendInfo(friendId);
      this.showModal('challenge');
    })
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





  render() {
    return(
      <View style={styles.container}>
        <View style={[styles.topBanner]}>
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', top: 15}}>
            {this.state.fontLoaded ? (
              <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
                  <Text style={{fontFamily: 'arcade', fontSize: 65, color: 'white'}}>
                    BLITZ
                  </Text>
                </View>
                <Text style={{fontFamily: 'arcade', fontSize: 65, color: 'white'}}>
                  Mode
                </Text>
              </View>
            ) : (null)}
          </View>
        </View>
        <Modal
          isVisible={this.state.challengeModal}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}
        >
          <View style={styles.otherModal}>
            <ChallengeModal
              close={this.closeModal.bind(this)}
              fbId={this.state.fbId}
              friendId={this.state.friendId}
            />
          </View>
        </Modal>
        <Modal
          isVisible={this.state.hereComesANewChallenger}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}
        >
          <View style={styles.otherModal}>
            <HereComesANewChallengerModal
              close={this.closeModal.bind(this)}
              fbId={this.state.fbId}
              challenger={this.state.challenger}
            />
          </View>
        </Modal>
        <Modal
          isVisible={this.state.howToModal}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}
        >
          <View style={styles.otherModal}>
            <HowToPlayBlitz
              close={this.closeModal.bind(this)}
              fbId={this.state.fbId}
              challenger={this.state.challenger}
            />
          </View>
        </Modal>
        <View style={styles.box}>
          <Text style={[styles.font, {fontSize: 30, textDecorationLine: 'underline'}]}>
            Friends online
          </Text>
        </View>
        <View style={{flex: 4, backgroundColor: 'black', position: 'relative', width: "100%"}}>
          <ScrollView
            style={{position: 'absolute', top: 0, left: 0, bottom: 0, right: 0}}
            contentContainerStyle={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: "100%"}}
            ref={"scrollz"}
          >
            {this.state.friendsOnline.map((friend, i) => {
              let name = friend.name.slice(0, 10);
              let space = name.indexOf(' ');
              if (space > 0) { name = name.slice(0, space) };
              return (
                <View style={[styles.box, {flexDirection: 'row'}]} key={i}>
                  <View style={styles.box}>
                    <TouchableOpacity onPress={() => this.challengeFriend(friend)}>
                      <Image
                        source={{uri: friend.profilePic}}
                        style={{width: 60, height: 60, resizeMode: 'contain'}}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.box}>
                    <TouchableOpacity onPress={() => this.challengeFriend(friend)}>
                      <Text style={[styles.font, {fontSize: 25}]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </ScrollView>
        </View>
        <View style={[styles.box, {flex: 1.5}]}>
          <View style={{flex: 1, flexDirection:'row', width: "100%", backgroundColor: 'lightblue'}}>
            <View style={styles.box}>
              <TouchableOpacity onPress={() => this.showModal('howToPlay')}>
                <Text style={[styles.font, {fontSize: 20}]}>
                  How to play
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.box}>
              <TouchableOpacity>
                <Text style={[styles.font, {fontSize: 20}]}>
                  Play someone new
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{flex: 1}}>
            <TouchableOpacity onPress={this.goBack.bind(this)}>
              <Text style={styles.font}>
                Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    width: "100%"
  },
  font: {
    fontSize: 40,
    fontFamily: 'arcade',
    color: 'white'
  },
  topBanner: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: "100%",
    zIndex: 80
  },
  showCase: {
    flex: 3.5,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    width: "100%",
    flexDirection: 'column',
    zIndex: 99
  },
  gameContainer: {
    flex: 4,
    flexDirection: 'row',
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    height: "100%",
    zIndex: 99
  },
  botBanner: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    width: "100%",
  },
  otherModal: {
    backgroundColor: 'white',
    padding: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    height: "60%"
  },
})
