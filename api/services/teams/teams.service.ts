import { ApolloError, ValidationError } from 'apollo-server-express';
import dayjs from 'dayjs';

import { getAllTeam, createNewTeamAndMember, getTeam, GetAllTeamResponse } from '~/repository/team.repository';
import { createTeamInvitation, VALID_PERIOD_DAYS } from '~/repository/team_invitations.repository';
import formatDateDB from '~/utils/format-date-db';
import compileEmailTemplate from '~/helpers/compile-email-template';
import generateRandomKey from '~/helpers/genarateRandomkey';
import { normalizeEmail, stringToSlug } from '~/helpers/string.helper';
import logger from '~/utils/logger';
import {sendMail} from '~/libs/mail';
import { createMemberAndInviteToken, getListTeamMemberByAliasTeam } from '../../repository/team_members.repository';
import { findUser } from '../../repository/user.repository';
import { UserProfile } from '~/repository/user.repository';
import { emailValidation } from '~/validations/email.validation';

type FindTeamByAliasResponse = {
  userName: string;
  userId: number;
  email: string;
  status: string;
  isOwner: boolean;
};

type CreateTeamResponse = {
  id: Promise<number | Error>;
  name: string;
  alias: string;
};

/**
 * Function to get all team
 *
 * @param User user User who execute this function
 *
 */
export async function getAllTeams(user: UserProfile): Promise<GetAllTeamResponse[]> {
  const allTeams = await getAllTeam({ userId: user.id });
  return allTeams;
}

/**
 * Function to get team by id
 *
 * @param User user   User who execute this function
 * @param int  teamId Id of team want to get
 *
 */
export async function findTeamByAlias(alias: string): Promise<FindTeamByAliasResponse[]> {
  const members = await getListTeamMemberByAliasTeam({ alias });
  return members.map((member) => ({
    userName: member.userName,
    userId: member.userId,
    email: member.email,
    status: member.status,
    isOwner: member.userId === member.owner,
  }));
}

/**
 * Function to create team
 *
 * @param User   user      User who create team
 * @param string teamName  Name of new team
 * @param string teamAlias Alias of new team
 */
export async function createTeam(user: UserProfile, teamName: string, teamAlias: string): Promise<CreateTeamResponse> {
  const alias = stringToSlug(teamAlias);

  const team = await getTeam({ alias });
  if (team) {
    throw new ApolloError('Team exist');
  }
  const teamId = createNewTeamAndMember({ name: teamName, alias, userid: user.id });

  return {
    id: teamId,
    name: teamName,
    alias,
  };
}

/**
 * Function to invite team member
 *
 * @param User   user         User who create invitation
 * @param int    alias       alias of team you want to invite to join
 * @param string inviteeEmail Email of who you want to send invitation to
 */
export async function inviteTeamMember(user: UserProfile, alias: string, inviteeEmail: string): Promise<FindTeamByAliasResponse> {

  const validateResult = emailValidation(inviteeEmail);
    
  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','));
  }

  try {
    const team = await getTeam({ alias });
    if (!team) {
      throw new ApolloError('Team not found');
    }

    if (user.email === inviteeEmail) {
      throw new ApolloError('Can\'t invite yourself');
    }

    const member = await findUser({ email: inviteeEmail });

    const token = await generateRandomKey();
    const subject = 'Team invitation';
    const template = await compileEmailTemplate({
      fileName: 'inviteTeamMember.mjml',
      data: {
        teamName: team.name,
        url: `${process.env.FRONTEND_URL}/teams/invitation/${token}`,
      },
    });

    const queries: (Promise<boolean> | Promise<number[]>)[] = [sendMail(normalizeEmail(inviteeEmail), subject, template)];
    if (member) {
      queries.push(createMemberAndInviteToken({
        email: inviteeEmail,
        token,
        teamId: team.id,
        memberId: member.id,
        userId: user.id,
      }));
    } else {
      queries.push(createTeamInvitation({
        email: inviteeEmail,
        token,
        invited_by: user.id,
        team_id: team.id,
        valid_until: formatDateDB(dayjs().add(VALID_PERIOD_DAYS, 'day')),
        status: 'active',
      }));
    }
    await Promise.all<boolean | number[]>(queries);
    return {
      userName: member.name,
      userId: member.id,
      email: member.email,
      status: 'pending',
      isOwner: false,
    };
  } catch (error) {
    logger.error(error);
    throw new ApolloError(error);
  }
}
