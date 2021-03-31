// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// ***************************************************************
// - [#] indicates a test step (e.g. # Go to a page)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element ID when selecting an element. Create one if none.
// ***************************************************************

// Group: @enterprise @elasticsearch @autocomplete

import {
    createEmail,
    enableElasticSearch,
    searchAndVerifyChannel,
    searchAndVerifyUser,
    withTimestamp,
} from './helpers';

describe('Autocomplete with Elasticsearch - Renaming', () => {
    const timestamp = Date.now();
    let testTeam;

    before(() => {
        // * Check if server has license for Elasticsearch
        cy.apiRequireLicenseForFeature('Elasticsearch');

        // # Create new team for tests
        cy.apiCreateTeam(`elastic-${timestamp}`, `elastic-${timestamp}`).then(({team}) => {
            testTeam = team;
        });

        // # Enable Elasticsearch
        enableElasticSearch();
    });

    it('renamed user appears in message input box', () => {
        const spiderman = {
            username: withTimestamp('spiderman', timestamp),
            password: 'passwd',
            first_name: 'Peter',
            last_name: 'Parker',
            email: createEmail('spiderman', timestamp),
            nickname: withTimestamp('friendlyneighborhood', timestamp),
        };

        // # Create a new user
        cy.apiCreateUser({user: spiderman}).then(({user}) => {
            cy.apiAddUserToTeam(testTeam.id, user.id).then(() => {
                cy.visit(`/${testTeam.name}/channels/town-square`);

                // # Verify user appears in search results pre-change
                searchAndVerifyUser(user);

                // # Rename a user
                const newName = withTimestamp('webslinger', timestamp);
                cy.apiPatchUser(user.id, {username: newName}).then(() => {
                    user.username = newName;

                    // # Verify user appears in search results post-change
                    searchAndVerifyUser(user);
                });
            });
        });
    });

    it('renamed channel appears in channel switcher', () => {
        const channelName = 'newchannel' + Date.now();
        const newChannelName = 'updatedchannel' + Date.now();

        // # Create a new channel
        cy.apiCreateChannel(testTeam.id, channelName, channelName).then(({channel}) => {
            // # Channel should appear in search results pre-change
            searchAndVerifyChannel(channel);

            // # Change the channels name
            cy.apiPatchChannel(channel.id, {name: newChannelName});
            channel.name = newChannelName;

            cy.reload();

            // # Search for channel and verify it appears
            searchAndVerifyChannel(channel);
        });
    });

    describe('renamed team', () => {
        let testUser;
        let testChannel;

        before(() => {
            const punisher = {
                username: withTimestamp('punisher', timestamp),
                password: 'passwd',
                first_name: 'Frank',
                last_name: 'Castle',
                email: createEmail('punisher', timestamp),
                nickname: withTimestamp('lockednloaded', timestamp),
            };

            // # Setup new channel and user
            cy.apiCreateUser({user: punisher}).then(({user}) => {
                testUser = user;

                cy.apiAddUserToTeam(testTeam.id, testUser.id).then(() => {
                    cy.visit(`/${testTeam.name}/channels/town-square`);

                    // # Hit escape to close and lingering modals
                    cy.get('body').type('{esc}');

                    // # Verify user appears in search results pre-change
                    searchAndVerifyUser(testUser);
                });
            });

            const channelName = 'another-channel' + Date.now();

            // # Create a new channel
            cy.apiCreateChannel(testTeam.id, channelName, channelName).then(({channel}) => {
                testChannel = channel;

                // # Channel should appear in search results pre-change
                searchAndVerifyChannel(testChannel);

                // # Hit escape to close the modal
                cy.get('body').type('{esc}');
            });

            // # Rename the team
            cy.apiPatchTeam(testTeam.id, {display_name: 'updatedteam' + timestamp});
        });

        it('correctly searches for user', () => {
            cy.get('body').type('{esc}');
            searchAndVerifyUser(testUser);
        });

        it('correctly searches for channel', () => {
            cy.get('body').type('{esc}');
            searchAndVerifyChannel(testChannel);
        });
    });
});
