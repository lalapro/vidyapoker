import React from 'react';
import { StyleSheet, Text, View, Button, PanResponder, Dimensions, Image, Animated, TouchableOpacity, AsyncStorage } from 'react-native';
import { Font } from 'expo';
import HexGrid from './HexGrid.js';
import { adjacentTiles, keyTiles } from '../helpers/tileLogic';
import shuffledDeck from '../helpers/shuffledDeck';
import calculateScore from '../helpers/calculateScore';
import handAnimations from '../helpers/handAnimations';
import cardImages from '../helpers/cardImages';
import database from '../firebase/db'

export default class BlitzJoin extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      deck: null,
      currentTile: null,
      startingTiles: [1, 4, 3, 4, 1],
      selectedTiles: [],
      chosenCards:[],
      tileResponders: {},
      adjacentTiles: adjacentTiles,
      availableTiles: [],
      destroy: false,
      completedHands: [],
      animatedHand: handAnimations,
      lastCompletedHand: '',
      hoverHand: [],
      emptyTiles: [],
      restart: false,
      fontLoaded: false,
      gameStarted: false,
      hofModal: false,
      blinky: false,
      gameOverModal: false,
      totalscore: 0,
      fbId: null
    }
    this._panResponder = PanResponder.create({
      onMoveShouldSetPanResponder:(evt, gestureState) => this.state.gameStarted,
      onPanResponderMove: (evt, gestureState) => {
        // console.log(gestureState)
        tileResponders = this.state.tileResponders;
        currentTile = this.state.currentTile;
        // console.log(this.generateAvailableTiles(this.state.currentTile))

        if (currentTile === null) {
          for(key in tileResponders) {
            // if touch gesture is between boxes...
            if (gestureState.numberActiveTouches === 1) {
              insideX = gestureState.moveX >= tileResponders[key].x && gestureState.moveX <= (tileResponders[key].x + 40);
              insideY = gestureState.moveY >= tileResponders[key].y && gestureState.moveY <= (tileResponders[key].y + 55);
              if (insideX && insideY) {
                this.selectNewTile(key);
              }
            }
          }
        }
        else {
          let neighborTiles = this.state.availableTiles
          for (let i = 0; i < neighborTiles.length; i++) {
            if (gestureState.numberActiveTouches === 1) {
              key = neighborTiles[i]
              insideX = gestureState.moveX >= tileResponders[key].x && gestureState.moveX <= (tileResponders[key].x + 40);
              insideY = gestureState.moveY >= tileResponders[key].y && gestureState.moveY <= (tileResponders[key].y + 55);
              if (insideX && insideY) {
                this.selectNewTile(key);
              }
            }
          }
        }
      },
      onPanResponderTerminate: (evt) => true,
      onPanResponderRelease: (evt, gestureState) => {
        if (this.state.chosenCards.length === 5 && this.state.selectedTiles.length === 5 && this.noBlanks(this.state.chosenCards)) {
          this.destroy();
        } else {
          this.reset();
        }
      }
    });
  }

  noBlanks(arr) {
    return arr.every(card => card["value"] !== "");
  }

  async componentWillMount() {
    let fbId = await AsyncStorage.getItem('fbId');
    database.gameRooms.child(fbId).child('blitzRoom').once('value', snap => {
      let roomKey = snap.val();
      database.blitzGame.child(roomKey).child('deck').once('value', snappy => {
        let deck = snappy.val().slice();
        this.setState({deck})
      })
    })
    database.fbFriends.child(fbId).once('value', snap => {
      let facebookData = snap.val();
      let fbName = facebookData.name.slice(0, 10);
      let fbPic = facebookData.fbPic;
      let space = fbName.indexOf(' ');
      if (space > 0) {
        fbName = fbName.slice(0, space);
      }
      this.setState({fbName, fbPic});
    })
  }

  async componentDidMount() {

    await Font.loadAsync({
      'arcade': require('../assets/fonts/arcadeclassic.regular.ttf'),
    });
    this.setState({
      fontLoaded: true
    }, () => this.startGame())
  }

  selectNewTile(key) {
    if (this.state.selectedTiles.indexOf(key) === -1) {
      this.setState({
        selectedTiles: [...this.state.selectedTiles, key]
      })
    }
    this.setState({
      currentTile: key,
      availableTiles: adjacentTiles[key]
    })
  }

  setLayout(pos, obj) {
    this.state.tileResponders[pos] = obj;
    this.setState({
      tileResponders: this.state.tileResponders,
    })
  }

  destroy() {
    this.state.completedHands.push(calculateScore(this.state.chosenCards))
    hand = calculateScore(this.state.chosenCards);


    this.setState({
      destroy: true,
      pressed: true,
      lastCompletedHand: hand[0],
      totalscore: this.state.totalscore += hand[1],
    }, () => {
      this.setState({
        destroy: false,
        chosenCards: [],
        selectedTiles: [],
        currentTile: null,
      })
      // connected to scoring animation and storing KEY TILES
      setTimeout(() => {this.setState({
        pressed: false,
        hoverHand: []
      })}, 750)
    });
  }

  addEmptyTiles(tile) {
    if (!this.state.emptyTiles.includes(tile)) {
      this.setState({
        emptyTiles: [...this.state.emptyTiles, tile]
      }, () => this.checkGameOver())
    }
  }

  checkGameOver() {
    if (this.state.emptyTiles.length === 5 || this.state.completedHands.length === 10) {
      this.gameOver();
    }
  }

  gameOver() {
    console.log('game over')
  }

  reset() {
    this.setState({
      destroy: true,
      chosenCards: [],
      selectedTiles: [],
      hoverHand: [],
      currentTile: null
    }, () => {
      this.setState({
        destroy: false
      })
    })
  }

  addToChosenCards(card) {
    let alreadyChosen = this.state.chosenCards.indexOf(card);
    if (alreadyChosen === -1 && this.state.chosenCards.length < 5) {
      this.setState({
        chosenCards: [...this.state.chosenCards, card],
        hoverHand: [...this.state.hoverHand, card]
      })
    }
  }

  startGame() {
    this.setState({
      gameStarted: true,
      animateStartOfGame: true,
      restart: true,
    }, () => {
      this.setState({
        animateStartOfGame: false,
        restart: false
      })
    })
    setTimeout(() => {
      this.setState({
        showScore: true
      })
    }, 450)
  }

  goBack() {
    this.props.navigation.goBack()
  }

  render() {
    return(
      this.state.deck !== null ? (
        <View style={styles.container}>
          {this.state.gameStarted ? (
            <View style={styles.showCase}>
              {this.state.fontLoaded && this.state.showScore ? (
                <View style={{flex: 1, justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'black', flexDirection: 'row', width: "90%"}}>
                  <TouchableOpacity onPress={() => this.switchModal('hof')}>
                    <Image source={{uri: this.state.fbPic}} style={{width: 50, height: 50, resizeMode: 'contain'}}/>
                  </TouchableOpacity>
                  <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                    <Text style={{fontFamily: 'arcade', fontSize: 30, color: 'yellow'}}>
                      BLITZ MODE!
                    </Text>
                  </View>
                  <TouchableOpacity onPress={this.goBack.bind(this)}>
                    {this.state.fontLoaded ? (
                      <Image source={{uri: this.state.fbPic}} style={{width: 50, height: 50, resizeMode: 'contain'}}/>
                    ) : null}
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={{flex: 1, flexDirection: 'row'}}>
                {this.state.hoverHand.map((card, i) => {
                  if (i%2 === 0) {
                    return (
                      <Image source={cardImages[card.value]}
                        style={{top: 15, width: 85, height: 85, resizeMode: 'contain', marginRight: -15}}
                        key={i}
                      />
                    )
                  } else {
                    return (
                      <Image source={cardImages[card.value]}
                        style={{top:40, width: 85, height: 85, resizeMode: 'contain', marginRight: -15}}
                        key={i}
                      />
                    )
                  }
                })}
              </View>
            </View>
          ) : (null)}
          <View style={styles.gameContainer} {...this._panResponder.panHandlers} ref="mycomp">
            {this.state.pressed ? (
              <View style={{position: 'absolute', zIndex: 2}}>
                <Image source={this.state.animatedHand[this.state.lastCompletedHand]} style={{width: 300, height: 100, resizeMode: 'contain'}}/>
              </View>
            ) : null}
            {this.state.startingTiles.map((tiles, i) => (
              <HexGrid
                deck={this.state.deck}
                tiles={tiles}
                add={this.addToChosenCards.bind(this)}
                chosen={this.state.chosenCards}
                destroy={this.state.destroy}
                layoutCreators={this.setLayout.bind(this)}
                selectedTiles={this.state.selectedTiles}
                restart={this.state.restart}
                gameStarted={this.state.animateStartOfGame}
                addEmpty={this.addEmptyTiles.bind(this)}
                hoverHand={this.state.hoverHand}
                x={i}
                key={i}
              />
            ))}
          </View>
          {!this.state.gameStarted ? (
            <View style={{flex: 1.5, backgroundColor: 'purple'}}>
            </View>
          ) : (null)}
          <View style={styles.botBanner}>
            <Text style={{fontSize: 60}} onPress={this.startGame.bind(this)}>
              Jabroni Code
            </Text>
          </View>
          {/* {boxes.map((tiles, i) => {
            return (
                <View style={{width: 40, height: 55, top: tiles.y, left: tiles.x ,backgroundColor:'red', position: 'absolute', zIndex: 999}} key={i}/>
            )
          })} */}
        </View>
      ) : (null)
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
    backgroundColor: 'black'
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
})