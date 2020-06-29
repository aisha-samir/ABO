import React, { Component } from 'react';
import {
    StyleSheet,
    SafeAreaView,
    View,
    FlatList,
    ScrollView,
    Dimensions
} from 'react-native';
import Card from '../components/Cards/RequestCard';
import { calcRatio, calcWidth, calcHeight } from '../Dimension';
import Colors from '../assets/Colors';
import Header from '../components/Header';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { sin, pow, cos, tan } from 'react-native-reanimated';

export default class AllRequests extends Component {
    constructor(props) {
        super(props)
        this.state = {
            requestsID: [],
            data: [],
            ID_Address: [],
            matchedRequests: [],//Blood type
            matchedRequests2: [],//place
            user_LatLon: '',
            acceptedID: []
        }
    }
    componentDidMount = async () => {
        this.getrequestData()
        // this.BloodType_matching()
        //this.Address_matching()
    }
    getrequestData() {
        database()
            .ref('BloodRequests/AllRequests')
            .on('value', snapshot => {
                let data1 = [], data2 = []
                let requestsID1 = []
                if (snapshot.val() != null) {
                    for (let index = 0; index < Object.keys(snapshot.val()).length; index++) {
                        requestsID1.push(Object.keys(snapshot.val())[index])
                        data1.push(snapshot.val()[requestsID1[index]])
                    }
                    for (let index = 0; index < requestsID1.length; index++) {
                        data1[index]['requestID'] = requestsID1[index]
                    }
                    database()
                        .ref('users/' + auth().currentUser.uid + '/AcceptedReq')
                        .on('value', snapshot => {
                            let acceptedIDD = []
                            if (snapshot.val() != null) {
                                acceptedIDD = Object.keys(snapshot.val())
                            }
                            this.setState({ acceptedID: acceptedIDD }, () => {
                                for (let index = 0; index < data1.length; index++) {
                                    let count = 0
                                    for (let x = 0; x < this.state.acceptedID.length; x++) {
                                        if (this.state.acceptedID[x] == data1[index]['requestID']) {
                                            count++
                                        }
                                    }
                                    if (count == 0) {
                                        if (data1[index]['remaining'] > 0) {
                                            if (data1[index]['dayCount'] < 7) {
                                                data2.push(data1[index])
                                            }
                                        }
                                    }

                                }
                                this.setState({ requestsID: requestsID1, data: data2 }, () => { this.BloodType_matching() })
                            })
                        })
                } else {
                    alert('There is no blood request yet')
                }
            });
    }

    BloodType_matching() {
        let userBloodType = '', matchedRequsets = []
        database()
            .ref('users/' + auth().currentUser.uid + '/informations/bloodType')
            .on('value', snapshot => {
                userBloodType = snapshot.val()
                for (let x = 0; x < this.state.data.length; x++) {
                    let count = 0
                    for (let y = 0; y < this.state.data[x].BloodTypes.length; y++) {
                        if (userBloodType == this.state.data[x].BloodTypes[y]) {
                            count++;
                        }
                    }
                    if (count != 0) {
                        matchedRequsets.push(this.state.data[x])
                    }
                }
                this.setState({ matchedRequests: matchedRequsets }, () => {
                    this.Address_matching()
                })
            });
    }
    Address_matching() {
        if (this.state.matchedRequests != null) {
            let newMatched = [], user_LatLon = []
            database()
                .ref('users/' + auth().currentUser.uid + '/informations/address')
                .on('value', snapshot => {
                    user_LatLon = { 'lat': snapshot.val().lat, 'lon': snapshot.val().lon }
                    this.setState({ user_LatLon: user_LatLon })
                    for (let index = 0; index < this.state.matchedRequests.length; index++) {
                        newMatched.push({
                            'BloodTypes': this.state.matchedRequests[index]['BloodTypes'],
                            'BloodbagsNum': this.state.matchedRequests[index]['BloodbagsNum'],
                            'Patient_name': this.state.matchedRequests[index]['Patient_name'],
                            'mobile_number': this.state.matchedRequests[index]['mobile_number'],
                            'requestID': this.state.matchedRequests[index]['requestID'],
                            'user_id': this.state.matchedRequests[index]['user_id'],
                            'address': this.state.matchedRequests[index]['address']['text'],
                            'lat': this.state.matchedRequests[index]['address']['lat'],
                            'lon': this.state.matchedRequests[index]['address']['lon'],
                            'latDef': Math.abs(this.state.user_LatLon['lat'] - this.state.matchedRequests[index]['address']['lat']),
                            'lonDef': Math.abs(this.state.user_LatLon['lon'] - this.state.matchedRequests[index]['address']['lon'])
                        })
                    }
                    let Outcomes = []
                    for (let index = 0; index < newMatched.length; index++) {
                        let a = Math.pow(Math.sin(newMatched[index]['latDef'] / 2), 2) + Math.cos(this.state.user_LatLon['lat']) * Math.cos(newMatched[index]['lat']) * Math.pow(Math.sin(newMatched[index]['lonDef'] / 2), 2)
                        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
                        Outcomes.push({
                            'BloodTypes': newMatched[index]['BloodTypes'],
                            'BloodbagsNum': newMatched[index]['BloodbagsNum'],
                            'Patient_name': newMatched[index]['Patient_name'],
                            'mobile_number': newMatched[index]['mobile_number'],
                            'requestID': newMatched[index]['requestID'],
                            'user_id': newMatched[index]['user_id'],
                            'address': newMatched[index]['address'],
                            'Outcome': c
                        })
                    }
                    Outcomes.sort(function (a, b) {
                        return a.Outcome - b.Outcome;
                    })
                    this.setState({ matchedRequests2: Outcomes }, () => {
                        if (Outcomes.length == 0) {
                            alert('There is no blood request yet')
                        }
                    })
                })
        }
    }
    render() {
        return (
            <SafeAreaView style={styles.container} >
                <Header title={"All blood requests"} navigation={this.props.navigation} />
                < ScrollView >
                    {/* <Card /> */}
                    <FlatList
                        data={this.state.matchedRequests2}
                        renderItem={({ item }) => <Card name={item.Patient_name} type={item.BloodTypes[0]} Adress={item.address} needsunits={item.BloodbagsNum} requestID={item.requestID} navigation={this.props.navigation} />}
                    />
                </ScrollView>
            </SafeAreaView >

        );
    }
}


const styles = StyleSheet.create({
    container:
    {
        flex: 1,
        backgroundColor: Colors.Whitebackground,
        paddingBottom: 15
    },
    header:
    {
        flexDirection: 'row',
        backgroundColor: Colors.Whitebackground,
        width: calcWidth(375),
        height: calcHeight(35),
        marginTop: calcHeight(47),
        marginBottom: calcHeight(25),

    },
    backbutton:
    {
        backgroundColor: Colors.Whitebackground,
        width: calcWidth(20),
        height: calcHeight(30),
        marginLeft: calcWidth(25),
        alignItems: 'center',

    },
    backicon:
    {

        width: calcWidth(17.61),
        height: calcHeight(32),

    },
    title:
    {
        fontFamily: 'Roboto-Medium',
        fontSize: calcWidth(18),
        color: Colors.theme,
        marginLeft: calcWidth(20.4),

    },

});









{/* start headr */ }
{/* <View style={styles.header}> */ }

{/* back button */ }
{/* <TouchableOpacity style={styles.backbutton}>
                        <Image source={require('../assets/images/right.png')} style={styles.backicon} />
                    </TouchableOpacity> */}

{/* label */ }
{/* <Text style={styles.title}>All blood requests</Text> */ }
{/* end headr */ }
{/* </View> */ }