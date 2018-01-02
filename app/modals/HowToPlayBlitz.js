import React from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, Image, AsyncStorage} from 'react-native';
import { Font } from 'expo';
import Swiper from 'react-native-swiper';


export default class HereComesANewChallengerModal extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      name: '',
      highscore: '',
      fontLoaded: false,
      accepted: false,
      countdown: 5,
      fbId: null
    }
  }

  async componentWillMount() {
    await Font.loadAsync({
      'arcade': require('../assets/fonts/arcadeclassic.regular.ttf'),
    });
    this.setState({fontLoaded: true})
  }


  render() {
    // console.log(this.state.friendsOnline)
    return(
      this.state.fontLoaded ? (
        <View style={styles.box}>
          <Swiper
            showsButtons={true}
            showsPagination={false}
            nextButton={<Image source={require('../assets/next.png')} style={{width:20, height: 20, resizeMode: 'contain'}}/>}
            prevButton={<Image source={require('../assets/prev.png')} style={{width:20, height: 20, resizeMode: 'contain'}}/>}
          >
            <View style={[styles.box, {alignItems: 'flex-end'}]}>
              {/* <View style={[styles.box, {alignItems: 'flex-end'}]}> */}
                <Text style={styles.font}>
                  Both players draw from the same deck of 104 cards...
                </Text>
              {/* </View> */}
            </View>
            <View style={[styles.box, {alignItems: 'flex-end'}]}>
              {/* <View style={[styles.box, {alignItems: 'flex-end'}]}> */}
                <Text style={styles.font}>
                  The player with the most points after 60 seconds wins!
                </Text>
              {/* </View> */}
            </View>
            <View style={[styles.box, {alignItems: 'flex-end'}]}>
              {/* <View style={[styles.box, {alignItems: 'flex-end'}]}> */}
                <Text style={styles.font}>
                  Anything is possible... even 5 of a kind!
                </Text>
              {/* </View> */}
            </View>
          </Swiper>
          <TouchableOpacity onPress={this.props.close}>
            <Text style={styles.font}>
              Back
            </Text>
          </TouchableOpacity>
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
