/* eslint-disable */
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core'
export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> }
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never }
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  Date: { input: any; output: any }
  DateTime: { input: any; output: any }
  Time: { input: any; output: any }
  Upload: { input: any; output: any }
}

export type ActivateNewUserInput = {
  activation_key: Scalars['ID']['input']
  name: Scalars['String']['input']
  password: Scalars['String']['input']
}

export type ApplyEditInput = {
  id: Scalars['ID']['input']
}

export type BodyModification = {
  __typename?: 'BodyModification'
  description?: Maybe<Scalars['String']['output']>
  location: Scalars['String']['output']
}

export type BodyModificationCriterionInput = {
  description?: InputMaybe<Scalars['String']['input']>
  location?: InputMaybe<Scalars['String']['input']>
  modifier: CriterionModifier
}

export type BodyModificationInput = {
  description?: InputMaybe<Scalars['String']['input']>
  location: Scalars['String']['input']
}

export type BreastTypeCriterionInput = {
  modifier: CriterionModifier
  value?: InputMaybe<BreastTypeEnum>
}

export enum BreastTypeEnum {
  Fake = 'FAKE',
  Na = 'NA',
  Natural = 'NATURAL'
}

export type CancelEditInput = {
  id: Scalars['ID']['input']
}

export type CommentCommentedEdit = {
  __typename?: 'CommentCommentedEdit'
  comment: EditComment
}

export type CommentOwnEdit = {
  __typename?: 'CommentOwnEdit'
  comment: EditComment
}

export type CommentVotedEdit = {
  __typename?: 'CommentVotedEdit'
  comment: EditComment
}

export enum CriterionModifier {
  /** = */
  Equals = 'EQUALS',
  Excludes = 'EXCLUDES',
  /** > */
  GreaterThan = 'GREATER_THAN',
  Includes = 'INCLUDES',
  /** INCLUDES ALL */
  IncludesAll = 'INCLUDES_ALL',
  /** IS NULL */
  IsNull = 'IS_NULL',
  /** < */
  LessThan = 'LESS_THAN',
  /** != */
  NotEquals = 'NOT_EQUALS',
  /** IS NOT NULL */
  NotNull = 'NOT_NULL'
}

export enum DateAccuracyEnum {
  Day = 'DAY',
  Month = 'MONTH',
  Year = 'YEAR'
}

export type DateCriterionInput = {
  modifier: CriterionModifier
  value: Scalars['Date']['input']
}

export type DownvoteOwnEdit = {
  __typename?: 'DownvoteOwnEdit'
  edit: Edit
}

export type Draft = {
  __typename?: 'Draft'
  created: Scalars['Time']['output']
  data: DraftData
  expires: Scalars['Time']['output']
  id: Scalars['ID']['output']
}

export type DraftData = PerformerDraft | SceneDraft

export type DraftEntity = {
  __typename?: 'DraftEntity'
  id?: Maybe<Scalars['ID']['output']>
  name: Scalars['String']['output']
}

export type DraftEntityInput = {
  id?: InputMaybe<Scalars['ID']['input']>
  name: Scalars['String']['input']
}

export type DraftFingerprint = {
  __typename?: 'DraftFingerprint'
  algorithm: FingerprintAlgorithm
  duration: Scalars['Int']['output']
  hash: Scalars['String']['output']
}

export type DraftSubmissionStatus = {
  __typename?: 'DraftSubmissionStatus'
  id?: Maybe<Scalars['ID']['output']>
}

export type Edit = {
  __typename?: 'Edit'
  applied: Scalars['Boolean']['output']
  bot: Scalars['Boolean']['output']
  closed?: Maybe<Scalars['Time']['output']>
  comments: Array<EditComment>
  created: Scalars['Time']['output']
  /** Is the edit considered destructive. */
  destructive: Scalars['Boolean']['output']
  details?: Maybe<EditDetails>
  expires?: Maybe<Scalars['Time']['output']>
  id: Scalars['ID']['output']
  /** Objects to merge with the target. Only applicable to merges */
  merge_sources: Array<EditTarget>
  /** Previous state of fields being modified - null if operation is create or delete. */
  old_details?: Maybe<EditDetails>
  operation: OperationEnum
  /** Entity specific options */
  options?: Maybe<PerformerEditOptions>
  status: VoteStatusEnum
  /** Object being edited - null if creating a new object */
  target?: Maybe<EditTarget>
  target_type: TargetTypeEnum
  updatable: Scalars['Boolean']['output']
  update_count: Scalars['Int']['output']
  updated?: Maybe<Scalars['Time']['output']>
  user?: Maybe<User>
  /**  = Accepted - Rejected */
  vote_count: Scalars['Int']['output']
  votes: Array<EditVote>
}

export type EditComment = {
  __typename?: 'EditComment'
  comment: Scalars['String']['output']
  date: Scalars['Time']['output']
  edit: Edit
  id: Scalars['ID']['output']
  user?: Maybe<User>
}

export type EditCommentInput = {
  comment: Scalars['String']['input']
  id: Scalars['ID']['input']
}

export type EditDetails = PerformerEdit | SceneEdit | StudioEdit | TagEdit

export type EditInput = {
  /** Edit submitted by an automated script. Requires bot permission */
  bot?: InputMaybe<Scalars['Boolean']['input']>
  comment?: InputMaybe<Scalars['String']['input']>
  /** Not required for create type */
  id?: InputMaybe<Scalars['ID']['input']>
  /** Only required for merge type */
  merge_source_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  operation: OperationEnum
}

export type EditQueryInput = {
  /** Filter by applied status */
  applied?: InputMaybe<Scalars['Boolean']['input']>
  direction?: SortDirectionEnum
  /** Filter out user's own edits */
  include_user_submitted?: InputMaybe<Scalars['Boolean']['input']>
  /** Filter to bot edits only */
  is_bot?: InputMaybe<Scalars['Boolean']['input']>
  /** Filter by favorite status */
  is_favorite?: InputMaybe<Scalars['Boolean']['input']>
  /** Filter by operation */
  operation?: InputMaybe<OperationEnum>
  page?: Scalars['Int']['input']
  per_page?: Scalars['Int']['input']
  sort?: EditSortEnum
  /** Filter by status */
  status?: InputMaybe<VoteStatusEnum>
  /** Filter by target id */
  target_id?: InputMaybe<Scalars['ID']['input']>
  /** Filter by target type */
  target_type?: InputMaybe<TargetTypeEnum>
  /** Filter by user id */
  user_id?: InputMaybe<Scalars['ID']['input']>
  /** Filter by vote count */
  vote_count?: InputMaybe<IntCriterionInput>
  /** Filter by user voted status */
  voted?: InputMaybe<UserVotedFilterEnum>
}

export enum EditSortEnum {
  ClosedAt = 'CLOSED_AT',
  CreatedAt = 'CREATED_AT',
  UpdatedAt = 'UPDATED_AT'
}

export type EditTarget = Performer | Scene | Studio | Tag

export type EditVote = {
  __typename?: 'EditVote'
  date: Scalars['Time']['output']
  user?: Maybe<User>
  vote: VoteTypeEnum
}

export type EditVoteInput = {
  id: Scalars['ID']['input']
  vote: VoteTypeEnum
}

export enum EthnicityEnum {
  Asian = 'ASIAN',
  Black = 'BLACK',
  Caucasian = 'CAUCASIAN',
  Indian = 'INDIAN',
  Latin = 'LATIN',
  MiddleEastern = 'MIDDLE_EASTERN',
  Mixed = 'MIXED',
  Other = 'OTHER'
}

export enum EthnicityFilterEnum {
  Asian = 'ASIAN',
  Black = 'BLACK',
  Caucasian = 'CAUCASIAN',
  Indian = 'INDIAN',
  Latin = 'LATIN',
  MiddleEastern = 'MIDDLE_EASTERN',
  Mixed = 'MIXED',
  Other = 'OTHER',
  Unknown = 'UNKNOWN'
}

export type EyeColorCriterionInput = {
  modifier: CriterionModifier
  value?: InputMaybe<EyeColorEnum>
}

export enum EyeColorEnum {
  Blue = 'BLUE',
  Brown = 'BROWN',
  Green = 'GREEN',
  Grey = 'GREY',
  Hazel = 'HAZEL',
  Red = 'RED'
}

export type FailedOwnEdit = {
  __typename?: 'FailedOwnEdit'
  edit: Edit
}

export enum FavoriteFilter {
  All = 'ALL',
  Performer = 'PERFORMER',
  Studio = 'STUDIO'
}

export type FavoritePerformerEdit = {
  __typename?: 'FavoritePerformerEdit'
  edit: Edit
}

export type FavoritePerformerScene = {
  __typename?: 'FavoritePerformerScene'
  scene: Scene
}

export type FavoriteStudioEdit = {
  __typename?: 'FavoriteStudioEdit'
  edit: Edit
}

export type FavoriteStudioScene = {
  __typename?: 'FavoriteStudioScene'
  scene: Scene
}

export type Fingerprint = {
  __typename?: 'Fingerprint'
  algorithm: FingerprintAlgorithm
  created: Scalars['Time']['output']
  duration: Scalars['Int']['output']
  hash: Scalars['String']['output']
  /** number of times this fingerprint has been reported */
  reports: Scalars['Int']['output']
  /** number of times this fingerprint has been submitted (excluding reports) */
  submissions: Scalars['Int']['output']
  updated: Scalars['Time']['output']
  /** true if the current user reported this fingerprint */
  user_reported: Scalars['Boolean']['output']
  /** true if the current user submitted this fingerprint */
  user_submitted: Scalars['Boolean']['output']
}

export enum FingerprintAlgorithm {
  Md5 = 'MD5',
  Oshash = 'OSHASH',
  Phash = 'PHASH'
}

export type FingerprintEditInput = {
  algorithm: FingerprintAlgorithm
  created: Scalars['Time']['input']
  duration: Scalars['Int']['input']
  hash: Scalars['String']['input']
  submissions?: InputMaybe<Scalars['Int']['input']>
  updated?: InputMaybe<Scalars['Time']['input']>
  user_ids?: InputMaybe<Array<Scalars['ID']['input']>>
}

export type FingerprintInput = {
  algorithm: FingerprintAlgorithm
  duration: Scalars['Int']['input']
  hash: Scalars['String']['input']
  /** assumes current user if omitted. Ignored for non-modify Users */
  user_ids?: InputMaybe<Array<Scalars['ID']['input']>>
}

export type FingerprintQueryInput = {
  algorithm: FingerprintAlgorithm
  hash: Scalars['String']['input']
}

export type FingerprintSubmission = {
  fingerprint: FingerprintInput
  scene_id: Scalars['ID']['input']
  unmatch?: InputMaybe<Scalars['Boolean']['input']>
  vote?: InputMaybe<FingerprintSubmissionType>
}

export enum FingerprintSubmissionType {
  /** Report as invalid */
  Invalid = 'INVALID',
  /** Remove vote */
  Remove = 'REMOVE',
  /** Positive vote */
  Valid = 'VALID'
}

export type FingerprintedSceneEdit = {
  __typename?: 'FingerprintedSceneEdit'
  edit: Edit
}

export type FuzzyDate = {
  __typename?: 'FuzzyDate'
  accuracy: DateAccuracyEnum
  date: Scalars['Date']['output']
}

export enum GenderEnum {
  Female = 'FEMALE',
  Intersex = 'INTERSEX',
  Male = 'MALE',
  NonBinary = 'NON_BINARY',
  TransgenderFemale = 'TRANSGENDER_FEMALE',
  TransgenderMale = 'TRANSGENDER_MALE'
}

export enum GenderFilterEnum {
  Female = 'FEMALE',
  Intersex = 'INTERSEX',
  Male = 'MALE',
  NonBinary = 'NON_BINARY',
  TransgenderFemale = 'TRANSGENDER_FEMALE',
  TransgenderMale = 'TRANSGENDER_MALE',
  Unknown = 'UNKNOWN'
}

export type GenerateInviteCodeInput = {
  keys?: InputMaybe<Scalars['Int']['input']>
  ttl?: InputMaybe<Scalars['Int']['input']>
  uses?: InputMaybe<Scalars['Int']['input']>
}

export type GrantInviteInput = {
  amount: Scalars['Int']['input']
  user_id: Scalars['ID']['input']
}

export type HairColorCriterionInput = {
  modifier: CriterionModifier
  value?: InputMaybe<HairColorEnum>
}

export enum HairColorEnum {
  Auburn = 'AUBURN',
  Bald = 'BALD',
  Black = 'BLACK',
  Blonde = 'BLONDE',
  Brunette = 'BRUNETTE',
  Grey = 'GREY',
  Other = 'OTHER',
  Red = 'RED',
  Various = 'VARIOUS',
  White = 'WHITE'
}

export type IdCriterionInput = {
  modifier: CriterionModifier
  value: Array<Scalars['ID']['input']>
}

export type Image = {
  __typename?: 'Image'
  height: Scalars['Int']['output']
  id: Scalars['ID']['output']
  url: Scalars['String']['output']
  width: Scalars['Int']['output']
}

export type ImageCreateInput = {
  file?: InputMaybe<Scalars['Upload']['input']>
  url?: InputMaybe<Scalars['String']['input']>
}

export type ImageDestroyInput = {
  id: Scalars['ID']['input']
}

export type ImageUpdateInput = {
  id: Scalars['ID']['input']
  url?: InputMaybe<Scalars['String']['input']>
}

export type IntCriterionInput = {
  modifier: CriterionModifier
  value: Scalars['Int']['input']
}

export type InviteKey = {
  __typename?: 'InviteKey'
  expires?: Maybe<Scalars['Time']['output']>
  id: Scalars['ID']['output']
  uses?: Maybe<Scalars['Int']['output']>
}

export type MarkNotificationReadInput = {
  id: Scalars['ID']['input']
  type: NotificationEnum
}

export type Measurements = {
  __typename?: 'Measurements'
  band_size?: Maybe<Scalars['Int']['output']>
  cup_size?: Maybe<Scalars['String']['output']>
  hip?: Maybe<Scalars['Int']['output']>
  waist?: Maybe<Scalars['Int']['output']>
}

export type MultiIdCriterionInput = {
  modifier: CriterionModifier
  value?: InputMaybe<Array<Scalars['ID']['input']>>
}

export type MultiStringCriterionInput = {
  modifier: CriterionModifier
  value: Array<Scalars['String']['input']>
}

export type Mutation = {
  __typename?: 'Mutation'
  activateNewUser?: Maybe<User>
  /** Apply edit without voting */
  applyEdit: Edit
  /** Cancel edit without voting */
  cancelEdit: Edit
  /** Changes the password for the current user */
  changePassword: Scalars['Boolean']['output']
  confirmChangeEmail: UserChangeEmailStatus
  destroyDraft: Scalars['Boolean']['output']
  /** Comment on an edit */
  editComment: Edit
  /** Vote to accept/reject an edit */
  editVote: Edit
  /** Favorite or unfavorite a performer */
  favoritePerformer: Scalars['Boolean']['output']
  /** Favorite or unfavorite a studio */
  favoriteStudio: Scalars['Boolean']['output']
  /** @deprecated Use generateInviteCodes */
  generateInviteCode?: Maybe<Scalars['ID']['output']>
  /** Generates an invite code using an invite token */
  generateInviteCodes: Array<Scalars['ID']['output']>
  /** Adds invite tokens for a user */
  grantInvite: Scalars['Int']['output']
  imageCreate?: Maybe<Image>
  imageDestroy: Scalars['Boolean']['output']
  /** Mark all of the current users notifications as read. */
  markNotificationsRead: Scalars['Boolean']['output']
  /** User interface for registering */
  newUser?: Maybe<Scalars['ID']['output']>
  performerCreate?: Maybe<Performer>
  performerDestroy: Scalars['Boolean']['output']
  /** Propose a new performer or modification to a performer */
  performerEdit: Edit
  /** Update a pending performer edit */
  performerEditUpdate: Edit
  performerUpdate?: Maybe<Performer>
  /** Regenerates the api key for the given user, or the current user if id not provided */
  regenerateAPIKey: Scalars['String']['output']
  /** Request an email change for the current user */
  requestChangeEmail: UserChangeEmailStatus
  /** Removes a pending invite code - refunding the token */
  rescindInviteCode: Scalars['Boolean']['output']
  /** Generates an email to reset a user password */
  resetPassword: Scalars['Boolean']['output']
  /** Removes invite tokens from a user */
  revokeInvite: Scalars['Int']['output']
  sceneCreate?: Maybe<Scene>
  sceneDestroy: Scalars['Boolean']['output']
  /** Propose a new scene or modification to a scene */
  sceneEdit: Edit
  /** Update a pending scene edit */
  sceneEditUpdate: Edit
  sceneUpdate?: Maybe<Scene>
  siteCreate?: Maybe<Site>
  siteDestroy: Scalars['Boolean']['output']
  siteUpdate?: Maybe<Site>
  studioCreate?: Maybe<Studio>
  studioDestroy: Scalars['Boolean']['output']
  /** Propose a new studio or modification to a studio */
  studioEdit: Edit
  /** Update a pending studio edit */
  studioEditUpdate: Edit
  studioUpdate?: Maybe<Studio>
  /** Matches/unmatches a scene to fingerprint */
  submitFingerprint: Scalars['Boolean']['output']
  submitPerformerDraft: DraftSubmissionStatus
  /** Draft submissions */
  submitSceneDraft: DraftSubmissionStatus
  tagCategoryCreate?: Maybe<TagCategory>
  tagCategoryDestroy: Scalars['Boolean']['output']
  tagCategoryUpdate?: Maybe<TagCategory>
  tagCreate?: Maybe<Tag>
  tagDestroy: Scalars['Boolean']['output']
  /** Propose a new tag or modification to a tag */
  tagEdit: Edit
  /** Update a pending tag edit */
  tagEditUpdate: Edit
  tagUpdate?: Maybe<Tag>
  /** Update notification subscriptions for current user. */
  updateNotificationSubscriptions: Scalars['Boolean']['output']
  userCreate?: Maybe<User>
  userDestroy: Scalars['Boolean']['output']
  userUpdate?: Maybe<User>
  validateChangeEmail: UserChangeEmailStatus
}

export type MutationActivateNewUserArgs = {
  input: ActivateNewUserInput
}

export type MutationApplyEditArgs = {
  input: ApplyEditInput
}

export type MutationCancelEditArgs = {
  input: CancelEditInput
}

export type MutationChangePasswordArgs = {
  input: UserChangePasswordInput
}

export type MutationConfirmChangeEmailArgs = {
  token: Scalars['ID']['input']
}

export type MutationDestroyDraftArgs = {
  id: Scalars['ID']['input']
}

export type MutationEditCommentArgs = {
  input: EditCommentInput
}

export type MutationEditVoteArgs = {
  input: EditVoteInput
}

export type MutationFavoritePerformerArgs = {
  favorite: Scalars['Boolean']['input']
  id: Scalars['ID']['input']
}

export type MutationFavoriteStudioArgs = {
  favorite: Scalars['Boolean']['input']
  id: Scalars['ID']['input']
}

export type MutationGenerateInviteCodesArgs = {
  input?: InputMaybe<GenerateInviteCodeInput>
}

export type MutationGrantInviteArgs = {
  input: GrantInviteInput
}

export type MutationImageCreateArgs = {
  input: ImageCreateInput
}

export type MutationImageDestroyArgs = {
  input: ImageDestroyInput
}

export type MutationMarkNotificationsReadArgs = {
  notification?: InputMaybe<MarkNotificationReadInput>
}

export type MutationNewUserArgs = {
  input: NewUserInput
}

export type MutationPerformerCreateArgs = {
  input: PerformerCreateInput
}

export type MutationPerformerDestroyArgs = {
  input: PerformerDestroyInput
}

export type MutationPerformerEditArgs = {
  input: PerformerEditInput
}

export type MutationPerformerEditUpdateArgs = {
  id: Scalars['ID']['input']
  input: PerformerEditInput
}

export type MutationPerformerUpdateArgs = {
  input: PerformerUpdateInput
}

export type MutationRegenerateApiKeyArgs = {
  userID?: InputMaybe<Scalars['ID']['input']>
}

export type MutationRescindInviteCodeArgs = {
  code: Scalars['ID']['input']
}

export type MutationResetPasswordArgs = {
  input: ResetPasswordInput
}

export type MutationRevokeInviteArgs = {
  input: RevokeInviteInput
}

export type MutationSceneCreateArgs = {
  input: SceneCreateInput
}

export type MutationSceneDestroyArgs = {
  input: SceneDestroyInput
}

export type MutationSceneEditArgs = {
  input: SceneEditInput
}

export type MutationSceneEditUpdateArgs = {
  id: Scalars['ID']['input']
  input: SceneEditInput
}

export type MutationSceneUpdateArgs = {
  input: SceneUpdateInput
}

export type MutationSiteCreateArgs = {
  input: SiteCreateInput
}

export type MutationSiteDestroyArgs = {
  input: SiteDestroyInput
}

export type MutationSiteUpdateArgs = {
  input: SiteUpdateInput
}

export type MutationStudioCreateArgs = {
  input: StudioCreateInput
}

export type MutationStudioDestroyArgs = {
  input: StudioDestroyInput
}

export type MutationStudioEditArgs = {
  input: StudioEditInput
}

export type MutationStudioEditUpdateArgs = {
  id: Scalars['ID']['input']
  input: StudioEditInput
}

export type MutationStudioUpdateArgs = {
  input: StudioUpdateInput
}

export type MutationSubmitFingerprintArgs = {
  input: FingerprintSubmission
}

export type MutationSubmitPerformerDraftArgs = {
  input: PerformerDraftInput
}

export type MutationSubmitSceneDraftArgs = {
  input: SceneDraftInput
}

export type MutationTagCategoryCreateArgs = {
  input: TagCategoryCreateInput
}

export type MutationTagCategoryDestroyArgs = {
  input: TagCategoryDestroyInput
}

export type MutationTagCategoryUpdateArgs = {
  input: TagCategoryUpdateInput
}

export type MutationTagCreateArgs = {
  input: TagCreateInput
}

export type MutationTagDestroyArgs = {
  input: TagDestroyInput
}

export type MutationTagEditArgs = {
  input: TagEditInput
}

export type MutationTagEditUpdateArgs = {
  id: Scalars['ID']['input']
  input: TagEditInput
}

export type MutationTagUpdateArgs = {
  input: TagUpdateInput
}

export type MutationUpdateNotificationSubscriptionsArgs = {
  subscriptions: Array<NotificationEnum>
}

export type MutationUserCreateArgs = {
  input: UserCreateInput
}

export type MutationUserDestroyArgs = {
  input: UserDestroyInput
}

export type MutationUserUpdateArgs = {
  input: UserUpdateInput
}

export type MutationValidateChangeEmailArgs = {
  email: Scalars['String']['input']
  token: Scalars['ID']['input']
}

export type NewUserInput = {
  email: Scalars['String']['input']
  invite_key?: InputMaybe<Scalars['ID']['input']>
}

export type Notification = {
  __typename?: 'Notification'
  created: Scalars['Time']['output']
  data: NotificationData
  read: Scalars['Boolean']['output']
}

export type NotificationData =
  | CommentCommentedEdit
  | CommentOwnEdit
  | CommentVotedEdit
  | DownvoteOwnEdit
  | FailedOwnEdit
  | FavoritePerformerEdit
  | FavoritePerformerScene
  | FavoriteStudioEdit
  | FavoriteStudioScene
  | FingerprintedSceneEdit
  | UpdatedEdit

export enum NotificationEnum {
  CommentCommentedEdit = 'COMMENT_COMMENTED_EDIT',
  CommentOwnEdit = 'COMMENT_OWN_EDIT',
  CommentVotedEdit = 'COMMENT_VOTED_EDIT',
  DownvoteOwnEdit = 'DOWNVOTE_OWN_EDIT',
  FailedOwnEdit = 'FAILED_OWN_EDIT',
  FavoritePerformerEdit = 'FAVORITE_PERFORMER_EDIT',
  FavoritePerformerScene = 'FAVORITE_PERFORMER_SCENE',
  FavoriteStudioEdit = 'FAVORITE_STUDIO_EDIT',
  FavoriteStudioScene = 'FAVORITE_STUDIO_SCENE',
  FingerprintedSceneEdit = 'FINGERPRINTED_SCENE_EDIT',
  UpdatedEdit = 'UPDATED_EDIT'
}

export enum OperationEnum {
  Create = 'CREATE',
  Destroy = 'DESTROY',
  Merge = 'MERGE',
  Modify = 'MODIFY'
}

export type Performer = {
  __typename?: 'Performer'
  age?: Maybe<Scalars['Int']['output']>
  aliases: Array<Scalars['String']['output']>
  band_size?: Maybe<Scalars['Int']['output']>
  birth_date?: Maybe<Scalars['String']['output']>
  /** @deprecated Please use `birth_date` */
  birthdate?: Maybe<FuzzyDate>
  breast_type?: Maybe<BreastTypeEnum>
  career_end_year?: Maybe<Scalars['Int']['output']>
  career_start_year?: Maybe<Scalars['Int']['output']>
  country?: Maybe<Scalars['String']['output']>
  created: Scalars['Time']['output']
  cup_size?: Maybe<Scalars['String']['output']>
  death_date?: Maybe<Scalars['String']['output']>
  deleted: Scalars['Boolean']['output']
  disambiguation?: Maybe<Scalars['String']['output']>
  edits: Array<Edit>
  ethnicity?: Maybe<EthnicityEnum>
  eye_color?: Maybe<EyeColorEnum>
  gender?: Maybe<GenderEnum>
  hair_color?: Maybe<HairColorEnum>
  /** Height in cm */
  height?: Maybe<Scalars['Int']['output']>
  hip_size?: Maybe<Scalars['Int']['output']>
  id: Scalars['ID']['output']
  images: Array<Image>
  is_favorite: Scalars['Boolean']['output']
  /** @deprecated Use individual fields, cup/band/waist/hip_size */
  measurements: Measurements
  /** IDs of performers that were merged into this one */
  merged_ids: Array<Scalars['ID']['output']>
  /** ID of performer that replaces this one */
  merged_into_id?: Maybe<Scalars['ID']['output']>
  name: Scalars['String']['output']
  piercings?: Maybe<Array<BodyModification>>
  scene_count: Scalars['Int']['output']
  scenes: Array<Scene>
  studios: Array<PerformerStudio>
  tattoos?: Maybe<Array<BodyModification>>
  updated: Scalars['Time']['output']
  urls: Array<Url>
  waist_size?: Maybe<Scalars['Int']['output']>
}

export type PerformerScenesArgs = {
  input?: InputMaybe<PerformerScenesInput>
}

export type PerformerAppearance = {
  __typename?: 'PerformerAppearance'
  /** Performing as alias */
  as?: Maybe<Scalars['String']['output']>
  performer: Performer
}

export type PerformerAppearanceInput = {
  /** Performing as alias */
  as?: InputMaybe<Scalars['String']['input']>
  performer_id: Scalars['ID']['input']
}

export type PerformerCreateInput = {
  aliases?: InputMaybe<Array<Scalars['String']['input']>>
  band_size?: InputMaybe<Scalars['Int']['input']>
  birthdate?: InputMaybe<Scalars['String']['input']>
  breast_type?: InputMaybe<BreastTypeEnum>
  career_end_year?: InputMaybe<Scalars['Int']['input']>
  career_start_year?: InputMaybe<Scalars['Int']['input']>
  country?: InputMaybe<Scalars['String']['input']>
  cup_size?: InputMaybe<Scalars['String']['input']>
  deathdate?: InputMaybe<Scalars['String']['input']>
  disambiguation?: InputMaybe<Scalars['String']['input']>
  draft_id?: InputMaybe<Scalars['ID']['input']>
  ethnicity?: InputMaybe<EthnicityEnum>
  eye_color?: InputMaybe<EyeColorEnum>
  gender?: InputMaybe<GenderEnum>
  hair_color?: InputMaybe<HairColorEnum>
  height?: InputMaybe<Scalars['Int']['input']>
  hip_size?: InputMaybe<Scalars['Int']['input']>
  image_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  name: Scalars['String']['input']
  piercings?: InputMaybe<Array<BodyModificationInput>>
  tattoos?: InputMaybe<Array<BodyModificationInput>>
  urls?: InputMaybe<Array<UrlInput>>
  waist_size?: InputMaybe<Scalars['Int']['input']>
}

export type PerformerDestroyInput = {
  id: Scalars['ID']['input']
}

export type PerformerDraft = {
  __typename?: 'PerformerDraft'
  aliases?: Maybe<Scalars['String']['output']>
  birthdate?: Maybe<Scalars['String']['output']>
  breast_type?: Maybe<Scalars['String']['output']>
  career_end_year?: Maybe<Scalars['Int']['output']>
  career_start_year?: Maybe<Scalars['Int']['output']>
  country?: Maybe<Scalars['String']['output']>
  deathdate?: Maybe<Scalars['String']['output']>
  disambiguation?: Maybe<Scalars['String']['output']>
  ethnicity?: Maybe<Scalars['String']['output']>
  eye_color?: Maybe<Scalars['String']['output']>
  gender?: Maybe<Scalars['String']['output']>
  hair_color?: Maybe<Scalars['String']['output']>
  height?: Maybe<Scalars['String']['output']>
  id?: Maybe<Scalars['ID']['output']>
  image?: Maybe<Image>
  measurements?: Maybe<Scalars['String']['output']>
  name: Scalars['String']['output']
  piercings?: Maybe<Scalars['String']['output']>
  tattoos?: Maybe<Scalars['String']['output']>
  urls?: Maybe<Array<Scalars['String']['output']>>
}

export type PerformerDraftInput = {
  aliases?: InputMaybe<Scalars['String']['input']>
  birthdate?: InputMaybe<Scalars['String']['input']>
  breast_type?: InputMaybe<Scalars['String']['input']>
  career_end_year?: InputMaybe<Scalars['Int']['input']>
  career_start_year?: InputMaybe<Scalars['Int']['input']>
  country?: InputMaybe<Scalars['String']['input']>
  deathdate?: InputMaybe<Scalars['String']['input']>
  disambiguation?: InputMaybe<Scalars['String']['input']>
  ethnicity?: InputMaybe<Scalars['String']['input']>
  eye_color?: InputMaybe<Scalars['String']['input']>
  gender?: InputMaybe<Scalars['String']['input']>
  hair_color?: InputMaybe<Scalars['String']['input']>
  height?: InputMaybe<Scalars['String']['input']>
  id?: InputMaybe<Scalars['ID']['input']>
  image?: InputMaybe<Scalars['Upload']['input']>
  measurements?: InputMaybe<Scalars['String']['input']>
  name: Scalars['String']['input']
  piercings?: InputMaybe<Scalars['String']['input']>
  tattoos?: InputMaybe<Scalars['String']['input']>
  urls?: InputMaybe<Array<Scalars['String']['input']>>
}

export type PerformerEdit = {
  __typename?: 'PerformerEdit'
  added_aliases?: Maybe<Array<Scalars['String']['output']>>
  added_images?: Maybe<Array<Maybe<Image>>>
  added_piercings?: Maybe<Array<BodyModification>>
  added_tattoos?: Maybe<Array<BodyModification>>
  added_urls?: Maybe<Array<Url>>
  aliases: Array<Scalars['String']['output']>
  band_size?: Maybe<Scalars['Int']['output']>
  birthdate?: Maybe<Scalars['String']['output']>
  breast_type?: Maybe<BreastTypeEnum>
  career_end_year?: Maybe<Scalars['Int']['output']>
  career_start_year?: Maybe<Scalars['Int']['output']>
  country?: Maybe<Scalars['String']['output']>
  cup_size?: Maybe<Scalars['String']['output']>
  deathdate?: Maybe<Scalars['String']['output']>
  disambiguation?: Maybe<Scalars['String']['output']>
  draft_id?: Maybe<Scalars['ID']['output']>
  ethnicity?: Maybe<EthnicityEnum>
  eye_color?: Maybe<EyeColorEnum>
  gender?: Maybe<GenderEnum>
  hair_color?: Maybe<HairColorEnum>
  /** Height in cm */
  height?: Maybe<Scalars['Int']['output']>
  hip_size?: Maybe<Scalars['Int']['output']>
  images: Array<Image>
  name?: Maybe<Scalars['String']['output']>
  piercings: Array<BodyModification>
  removed_aliases?: Maybe<Array<Scalars['String']['output']>>
  removed_images?: Maybe<Array<Maybe<Image>>>
  removed_piercings?: Maybe<Array<BodyModification>>
  removed_tattoos?: Maybe<Array<BodyModification>>
  removed_urls?: Maybe<Array<Url>>
  tattoos: Array<BodyModification>
  urls: Array<Url>
  waist_size?: Maybe<Scalars['Int']['output']>
}

export type PerformerEditDetailsInput = {
  aliases?: InputMaybe<Array<Scalars['String']['input']>>
  band_size?: InputMaybe<Scalars['Int']['input']>
  birthdate?: InputMaybe<Scalars['String']['input']>
  breast_type?: InputMaybe<BreastTypeEnum>
  career_end_year?: InputMaybe<Scalars['Int']['input']>
  career_start_year?: InputMaybe<Scalars['Int']['input']>
  country?: InputMaybe<Scalars['String']['input']>
  cup_size?: InputMaybe<Scalars['String']['input']>
  deathdate?: InputMaybe<Scalars['String']['input']>
  disambiguation?: InputMaybe<Scalars['String']['input']>
  draft_id?: InputMaybe<Scalars['ID']['input']>
  ethnicity?: InputMaybe<EthnicityEnum>
  eye_color?: InputMaybe<EyeColorEnum>
  gender?: InputMaybe<GenderEnum>
  hair_color?: InputMaybe<HairColorEnum>
  height?: InputMaybe<Scalars['Int']['input']>
  hip_size?: InputMaybe<Scalars['Int']['input']>
  image_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  name?: InputMaybe<Scalars['String']['input']>
  piercings?: InputMaybe<Array<BodyModificationInput>>
  tattoos?: InputMaybe<Array<BodyModificationInput>>
  urls?: InputMaybe<Array<UrlInput>>
  waist_size?: InputMaybe<Scalars['Int']['input']>
}

export type PerformerEditInput = {
  /** Not required for destroy type */
  details?: InputMaybe<PerformerEditDetailsInput>
  edit: EditInput
  /** Controls aliases modification for merges and name modifications */
  options?: InputMaybe<PerformerEditOptionsInput>
}

export type PerformerEditOptions = {
  __typename?: 'PerformerEditOptions'
  /** Set performer alias on scenes attached to merge sources to old name */
  set_merge_aliases: Scalars['Boolean']['output']
  /** Set performer alias on scenes without alias to old name if name is changed */
  set_modify_aliases: Scalars['Boolean']['output']
}

export type PerformerEditOptionsInput = {
  /** Set performer alias on scenes attached to merge sources to old name */
  set_merge_aliases?: InputMaybe<Scalars['Boolean']['input']>
  /** Set performer alias on scenes without alias to old name if name is changed */
  set_modify_aliases?: InputMaybe<Scalars['Boolean']['input']>
}

export type PerformerQueryInput = {
  age?: InputMaybe<IntCriterionInput>
  /** Search aliases only - assumes like query unless quoted */
  alias?: InputMaybe<Scalars['String']['input']>
  band_size?: InputMaybe<IntCriterionInput>
  birth_year?: InputMaybe<IntCriterionInput>
  birthdate?: InputMaybe<DateCriterionInput>
  breast_type?: InputMaybe<BreastTypeCriterionInput>
  career_end_year?: InputMaybe<IntCriterionInput>
  career_start_year?: InputMaybe<IntCriterionInput>
  country?: InputMaybe<StringCriterionInput>
  cup_size?: InputMaybe<StringCriterionInput>
  deathdate?: InputMaybe<DateCriterionInput>
  direction?: SortDirectionEnum
  disambiguation?: InputMaybe<StringCriterionInput>
  ethnicity?: InputMaybe<EthnicityFilterEnum>
  eye_color?: InputMaybe<EyeColorCriterionInput>
  gender?: InputMaybe<GenderFilterEnum>
  hair_color?: InputMaybe<HairColorCriterionInput>
  height?: InputMaybe<IntCriterionInput>
  hip_size?: InputMaybe<IntCriterionInput>
  /** Filter by performerfavorite status for the current user */
  is_favorite?: InputMaybe<Scalars['Boolean']['input']>
  /** Searches name only - assumes like query unless quoted */
  name?: InputMaybe<Scalars['String']['input']>
  /** Searches name and disambiguation - assumes like query unless quoted */
  names?: InputMaybe<Scalars['String']['input']>
  page?: Scalars['Int']['input']
  per_page?: Scalars['Int']['input']
  /** Filter by a performer they have performed in scenes with */
  performed_with?: InputMaybe<Scalars['ID']['input']>
  piercings?: InputMaybe<BodyModificationCriterionInput>
  sort?: PerformerSortEnum
  /** Filter by a studio */
  studio_id?: InputMaybe<Scalars['ID']['input']>
  tattoos?: InputMaybe<BodyModificationCriterionInput>
  /** Filter to search urls - assumes like query unless quoted */
  url?: InputMaybe<Scalars['String']['input']>
  waist_size?: InputMaybe<IntCriterionInput>
}

export type PerformerScenesInput = {
  /** Filter by another performer that also performs in the scenes */
  performed_with?: InputMaybe<Scalars['ID']['input']>
  /** Filter by a studio */
  studio_id?: InputMaybe<Scalars['ID']['input']>
  /** Filter by tags */
  tags?: InputMaybe<MultiIdCriterionInput>
}

export enum PerformerSortEnum {
  Birthdate = 'BIRTHDATE',
  CareerStartYear = 'CAREER_START_YEAR',
  CreatedAt = 'CREATED_AT',
  Deathdate = 'DEATHDATE',
  Debut = 'DEBUT',
  LastScene = 'LAST_SCENE',
  Name = 'NAME',
  SceneCount = 'SCENE_COUNT',
  UpdatedAt = 'UPDATED_AT'
}

export type PerformerStudio = {
  __typename?: 'PerformerStudio'
  scene_count: Scalars['Int']['output']
  studio: Studio
}

export type PerformerUpdateInput = {
  aliases?: InputMaybe<Array<Scalars['String']['input']>>
  band_size?: InputMaybe<Scalars['Int']['input']>
  birthdate?: InputMaybe<Scalars['String']['input']>
  breast_type?: InputMaybe<BreastTypeEnum>
  career_end_year?: InputMaybe<Scalars['Int']['input']>
  career_start_year?: InputMaybe<Scalars['Int']['input']>
  country?: InputMaybe<Scalars['String']['input']>
  cup_size?: InputMaybe<Scalars['String']['input']>
  deathdate?: InputMaybe<Scalars['String']['input']>
  disambiguation?: InputMaybe<Scalars['String']['input']>
  ethnicity?: InputMaybe<EthnicityEnum>
  eye_color?: InputMaybe<EyeColorEnum>
  gender?: InputMaybe<GenderEnum>
  hair_color?: InputMaybe<HairColorEnum>
  height?: InputMaybe<Scalars['Int']['input']>
  hip_size?: InputMaybe<Scalars['Int']['input']>
  id: Scalars['ID']['input']
  image_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  name?: InputMaybe<Scalars['String']['input']>
  piercings?: InputMaybe<Array<BodyModificationInput>>
  tattoos?: InputMaybe<Array<BodyModificationInput>>
  urls?: InputMaybe<Array<UrlInput>>
  waist_size?: InputMaybe<Scalars['Int']['input']>
}

/** The query root for this schema */
export type Query = {
  __typename?: 'Query'
  findDraft?: Maybe<Draft>
  findDrafts: Array<Draft>
  findEdit?: Maybe<Edit>
  /** Find a performer by ID */
  findPerformer?: Maybe<Performer>
  /** Find a scene by ID */
  findScene?: Maybe<Scene>
  /** Finds a scene by an algorithm-specific checksum */
  findSceneByFingerprint: Array<Scene>
  /**
   * Finds scenes that match a list of hashes
   * @deprecated Use findScenesBySceneFingerprints
   */
  findScenesByFingerprints: Array<Scene>
  /** @deprecated Use findScenesBySceneFingerprints */
  findScenesByFullFingerprints: Array<Scene>
  findScenesBySceneFingerprints: Array<Array<Scene>>
  /** Find an external site by ID */
  findSite?: Maybe<Site>
  /** Find a studio by ID or name */
  findStudio?: Maybe<Studio>
  /** Find a tag by ID or name */
  findTag?: Maybe<Tag>
  /** Find a tag category by ID */
  findTagCategory?: Maybe<TagCategory>
  /** Find a tag with a matching name or alias */
  findTagOrAlias?: Maybe<Tag>
  /** Find user by ID or username */
  findUser?: Maybe<User>
  getConfig: StashBoxConfig
  getUnreadNotificationCount: Scalars['Int']['output']
  /** Returns currently authenticated user */
  me?: Maybe<User>
  queryEdits: QueryEditsResultType
  queryExistingPerformer: QueryExistingPerformerResult
  queryExistingScene: QueryExistingSceneResult
  queryNotifications: QueryNotificationsResult
  queryPerformers: QueryPerformersResultType
  queryScenes: QueryScenesResultType
  querySites: QuerySitesResultType
  queryStudios: QueryStudiosResultType
  queryTagCategories: QueryTagCategoriesResultType
  queryTags: QueryTagsResultType
  queryUsers: QueryUsersResultType
  searchPerformer: Array<Performer>
  searchScene: Array<Scene>
  searchStudio: Array<Studio>
  searchTag: Array<Tag>
  version: Version
}

/** The query root for this schema */
export type QueryFindDraftArgs = {
  id: Scalars['ID']['input']
}

/** The query root for this schema */
export type QueryFindEditArgs = {
  id: Scalars['ID']['input']
}

/** The query root for this schema */
export type QueryFindPerformerArgs = {
  id: Scalars['ID']['input']
}

/** The query root for this schema */
export type QueryFindSceneArgs = {
  id: Scalars['ID']['input']
}

/** The query root for this schema */
export type QueryFindSceneByFingerprintArgs = {
  fingerprint: FingerprintQueryInput
}

/** The query root for this schema */
export type QueryFindScenesByFingerprintsArgs = {
  fingerprints: Array<Scalars['String']['input']>
}

/** The query root for this schema */
export type QueryFindScenesByFullFingerprintsArgs = {
  fingerprints: Array<FingerprintQueryInput>
}

/** The query root for this schema */
export type QueryFindScenesBySceneFingerprintsArgs = {
  fingerprints: Array<Array<FingerprintQueryInput>>
}

/** The query root for this schema */
export type QueryFindSiteArgs = {
  id: Scalars['ID']['input']
}

/** The query root for this schema */
export type QueryFindStudioArgs = {
  id?: InputMaybe<Scalars['ID']['input']>
  name?: InputMaybe<Scalars['String']['input']>
}

/** The query root for this schema */
export type QueryFindTagArgs = {
  id?: InputMaybe<Scalars['ID']['input']>
  name?: InputMaybe<Scalars['String']['input']>
}

/** The query root for this schema */
export type QueryFindTagCategoryArgs = {
  id: Scalars['ID']['input']
}

/** The query root for this schema */
export type QueryFindTagOrAliasArgs = {
  name: Scalars['String']['input']
}

/** The query root for this schema */
export type QueryFindUserArgs = {
  id?: InputMaybe<Scalars['ID']['input']>
  username?: InputMaybe<Scalars['String']['input']>
}

/** The query root for this schema */
export type QueryQueryEditsArgs = {
  input: EditQueryInput
}

/** The query root for this schema */
export type QueryQueryExistingPerformerArgs = {
  input: QueryExistingPerformerInput
}

/** The query root for this schema */
export type QueryQueryExistingSceneArgs = {
  input: QueryExistingSceneInput
}

/** The query root for this schema */
export type QueryQueryNotificationsArgs = {
  input: QueryNotificationsInput
}

/** The query root for this schema */
export type QueryQueryPerformersArgs = {
  input: PerformerQueryInput
}

/** The query root for this schema */
export type QueryQueryScenesArgs = {
  input: SceneQueryInput
}

/** The query root for this schema */
export type QueryQueryStudiosArgs = {
  input: StudioQueryInput
}

/** The query root for this schema */
export type QueryQueryTagsArgs = {
  input: TagQueryInput
}

/** The query root for this schema */
export type QueryQueryUsersArgs = {
  input: UserQueryInput
}

/** The query root for this schema */
export type QuerySearchPerformerArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  term: Scalars['String']['input']
}

/** The query root for this schema */
export type QuerySearchSceneArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  term: Scalars['String']['input']
}

/** The query root for this schema */
export type QuerySearchStudioArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  term: Scalars['String']['input']
}

/** The query root for this schema */
export type QuerySearchTagArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>
  term: Scalars['String']['input']
}

export type QueryEditsResultType = {
  __typename?: 'QueryEditsResultType'
  count: Scalars['Int']['output']
  edits: Array<Edit>
}

export type QueryExistingPerformerInput = {
  disambiguation?: InputMaybe<Scalars['String']['input']>
  name?: InputMaybe<Scalars['String']['input']>
  urls: Array<Scalars['String']['input']>
}

export type QueryExistingPerformerResult = {
  __typename?: 'QueryExistingPerformerResult'
  edits: Array<Edit>
  performers: Array<Performer>
}

export type QueryExistingSceneInput = {
  fingerprints: Array<FingerprintInput>
  studio_id?: InputMaybe<Scalars['ID']['input']>
  title?: InputMaybe<Scalars['String']['input']>
}

export type QueryExistingSceneResult = {
  __typename?: 'QueryExistingSceneResult'
  edits: Array<Edit>
  scenes: Array<Scene>
}

export type QueryNotificationsInput = {
  page?: Scalars['Int']['input']
  per_page?: Scalars['Int']['input']
  type?: InputMaybe<NotificationEnum>
  unread_only?: InputMaybe<Scalars['Boolean']['input']>
}

export type QueryNotificationsResult = {
  __typename?: 'QueryNotificationsResult'
  count: Scalars['Int']['output']
  notifications: Array<Notification>
}

export type QueryPerformersResultType = {
  __typename?: 'QueryPerformersResultType'
  count: Scalars['Int']['output']
  performers: Array<Performer>
}

export type QueryScenesResultType = {
  __typename?: 'QueryScenesResultType'
  count: Scalars['Int']['output']
  scenes: Array<Scene>
}

export type QuerySitesResultType = {
  __typename?: 'QuerySitesResultType'
  count: Scalars['Int']['output']
  sites: Array<Site>
}

export type QueryStudiosResultType = {
  __typename?: 'QueryStudiosResultType'
  count: Scalars['Int']['output']
  studios: Array<Studio>
}

export type QueryTagCategoriesResultType = {
  __typename?: 'QueryTagCategoriesResultType'
  count: Scalars['Int']['output']
  tag_categories: Array<TagCategory>
}

export type QueryTagsResultType = {
  __typename?: 'QueryTagsResultType'
  count: Scalars['Int']['output']
  tags: Array<Tag>
}

export type QueryUsersResultType = {
  __typename?: 'QueryUsersResultType'
  count: Scalars['Int']['output']
  users: Array<User>
}

export type ResetPasswordInput = {
  email: Scalars['String']['input']
}

export type RevokeInviteInput = {
  amount: Scalars['Int']['input']
  user_id: Scalars['ID']['input']
}

export type RoleCriterionInput = {
  modifier: CriterionModifier
  value: Array<RoleEnum>
}

export enum RoleEnum {
  Admin = 'ADMIN',
  Bot = 'BOT',
  Edit = 'EDIT',
  EditTags = 'EDIT_TAGS',
  /** May generate invites without tokens */
  Invite = 'INVITE',
  /** May grant and rescind invite tokens and resind invite keys */
  ManageInvites = 'MANAGE_INVITES',
  Modify = 'MODIFY',
  Read = 'READ',
  ReadOnly = 'READ_ONLY',
  Vote = 'VOTE'
}

export type Scene = {
  __typename?: 'Scene'
  code?: Maybe<Scalars['String']['output']>
  created: Scalars['Time']['output']
  /** @deprecated Please use `release_date` instead */
  date?: Maybe<Scalars['String']['output']>
  deleted: Scalars['Boolean']['output']
  details?: Maybe<Scalars['String']['output']>
  director?: Maybe<Scalars['String']['output']>
  duration?: Maybe<Scalars['Int']['output']>
  edits: Array<Edit>
  fingerprints: Array<Fingerprint>
  id: Scalars['ID']['output']
  images: Array<Image>
  performers: Array<PerformerAppearance>
  production_date?: Maybe<Scalars['String']['output']>
  release_date?: Maybe<Scalars['String']['output']>
  studio?: Maybe<Studio>
  tags: Array<Tag>
  title?: Maybe<Scalars['String']['output']>
  updated: Scalars['Time']['output']
  urls: Array<Url>
}

export type SceneFingerprintsArgs = {
  is_submitted?: InputMaybe<Scalars['Boolean']['input']>
}

export type SceneCreateInput = {
  code?: InputMaybe<Scalars['String']['input']>
  date: Scalars['String']['input']
  details?: InputMaybe<Scalars['String']['input']>
  director?: InputMaybe<Scalars['String']['input']>
  duration?: InputMaybe<Scalars['Int']['input']>
  fingerprints: Array<FingerprintEditInput>
  image_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  performers?: InputMaybe<Array<PerformerAppearanceInput>>
  production_date?: InputMaybe<Scalars['String']['input']>
  studio_id?: InputMaybe<Scalars['ID']['input']>
  tag_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  title?: InputMaybe<Scalars['String']['input']>
  urls?: InputMaybe<Array<UrlInput>>
}

export type SceneDestroyInput = {
  id: Scalars['ID']['input']
}

export type SceneDraft = {
  __typename?: 'SceneDraft'
  code?: Maybe<Scalars['String']['output']>
  date?: Maybe<Scalars['String']['output']>
  details?: Maybe<Scalars['String']['output']>
  director?: Maybe<Scalars['String']['output']>
  fingerprints: Array<DraftFingerprint>
  id?: Maybe<Scalars['ID']['output']>
  image?: Maybe<Image>
  performers: Array<SceneDraftPerformer>
  production_date?: Maybe<Scalars['String']['output']>
  studio?: Maybe<SceneDraftStudio>
  tags?: Maybe<Array<SceneDraftTag>>
  title?: Maybe<Scalars['String']['output']>
  urls?: Maybe<Array<Scalars['String']['output']>>
}

export type SceneDraftInput = {
  code?: InputMaybe<Scalars['String']['input']>
  date?: InputMaybe<Scalars['String']['input']>
  details?: InputMaybe<Scalars['String']['input']>
  director?: InputMaybe<Scalars['String']['input']>
  fingerprints: Array<FingerprintInput>
  id?: InputMaybe<Scalars['ID']['input']>
  image?: InputMaybe<Scalars['Upload']['input']>
  performers: Array<DraftEntityInput>
  production_date?: InputMaybe<Scalars['String']['input']>
  studio?: InputMaybe<DraftEntityInput>
  tags?: InputMaybe<Array<DraftEntityInput>>
  title?: InputMaybe<Scalars['String']['input']>
  url?: InputMaybe<Scalars['String']['input']>
  urls?: InputMaybe<Array<Scalars['String']['input']>>
}

export type SceneDraftPerformer = DraftEntity | Performer

export type SceneDraftStudio = DraftEntity | Studio

export type SceneDraftTag = DraftEntity | Tag

export type SceneEdit = {
  __typename?: 'SceneEdit'
  added_fingerprints?: Maybe<Array<Fingerprint>>
  added_images?: Maybe<Array<Maybe<Image>>>
  /** Added or modified performer appearance entries */
  added_performers?: Maybe<Array<PerformerAppearance>>
  added_tags?: Maybe<Array<Tag>>
  added_urls?: Maybe<Array<Url>>
  code?: Maybe<Scalars['String']['output']>
  date?: Maybe<Scalars['String']['output']>
  details?: Maybe<Scalars['String']['output']>
  director?: Maybe<Scalars['String']['output']>
  draft_id?: Maybe<Scalars['ID']['output']>
  duration?: Maybe<Scalars['Int']['output']>
  fingerprints: Array<Fingerprint>
  images: Array<Image>
  performers: Array<PerformerAppearance>
  production_date?: Maybe<Scalars['String']['output']>
  removed_fingerprints?: Maybe<Array<Fingerprint>>
  removed_images?: Maybe<Array<Maybe<Image>>>
  removed_performers?: Maybe<Array<PerformerAppearance>>
  removed_tags?: Maybe<Array<Tag>>
  removed_urls?: Maybe<Array<Url>>
  studio?: Maybe<Studio>
  tags: Array<Tag>
  title?: Maybe<Scalars['String']['output']>
  urls: Array<Url>
}

export type SceneEditDetailsInput = {
  code?: InputMaybe<Scalars['String']['input']>
  date?: InputMaybe<Scalars['String']['input']>
  details?: InputMaybe<Scalars['String']['input']>
  director?: InputMaybe<Scalars['String']['input']>
  draft_id?: InputMaybe<Scalars['ID']['input']>
  duration?: InputMaybe<Scalars['Int']['input']>
  fingerprints?: InputMaybe<Array<FingerprintInput>>
  image_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  performers?: InputMaybe<Array<PerformerAppearanceInput>>
  production_date?: InputMaybe<Scalars['String']['input']>
  studio_id?: InputMaybe<Scalars['ID']['input']>
  tag_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  title?: InputMaybe<Scalars['String']['input']>
  urls?: InputMaybe<Array<UrlInput>>
}

export type SceneEditInput = {
  /** Not required for destroy type */
  details?: InputMaybe<SceneEditDetailsInput>
  edit: EditInput
}

export type SceneQueryInput = {
  /** Filter to include scenes with performer appearing as alias */
  alias?: InputMaybe<StringCriterionInput>
  /** Filter by date */
  date?: InputMaybe<DateCriterionInput>
  direction?: SortDirectionEnum
  /** Filter by favorited entity */
  favorites?: InputMaybe<FavoriteFilter>
  /** Filter to only include scenes with these fingerprints */
  fingerprints?: InputMaybe<MultiStringCriterionInput>
  /** Filter to scenes with fingerprints submitted by the user */
  has_fingerprint_submissions?: InputMaybe<Scalars['Boolean']['input']>
  page?: Scalars['Int']['input']
  /** Filter to only include scenes with this studio as primary or parent */
  parentStudio?: InputMaybe<Scalars['String']['input']>
  per_page?: Scalars['Int']['input']
  /** Filter to only include scenes with these performers */
  performers?: InputMaybe<MultiIdCriterionInput>
  /** Filter by production date */
  production_date?: InputMaybe<DateCriterionInput>
  sort?: SceneSortEnum
  /** Filter to only include scenes with this studio */
  studios?: InputMaybe<MultiIdCriterionInput>
  /** Filter to only include scenes with these tags */
  tags?: InputMaybe<MultiIdCriterionInput>
  /** Filter to search title and details - assumes like query unless quoted */
  text?: InputMaybe<Scalars['String']['input']>
  /** Filter to search title - assumes like query unless quoted */
  title?: InputMaybe<Scalars['String']['input']>
  /** Filter to search urls - assumes like query unless quoted */
  url?: InputMaybe<Scalars['String']['input']>
}

export enum SceneSortEnum {
  CreatedAt = 'CREATED_AT',
  Date = 'DATE',
  Title = 'TITLE',
  Trending = 'TRENDING',
  UpdatedAt = 'UPDATED_AT'
}

export type SceneUpdateInput = {
  code?: InputMaybe<Scalars['String']['input']>
  date?: InputMaybe<Scalars['String']['input']>
  details?: InputMaybe<Scalars['String']['input']>
  director?: InputMaybe<Scalars['String']['input']>
  duration?: InputMaybe<Scalars['Int']['input']>
  fingerprints?: InputMaybe<Array<FingerprintEditInput>>
  id: Scalars['ID']['input']
  image_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  performers?: InputMaybe<Array<PerformerAppearanceInput>>
  production_date?: InputMaybe<Scalars['String']['input']>
  studio_id?: InputMaybe<Scalars['ID']['input']>
  tag_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  title?: InputMaybe<Scalars['String']['input']>
  urls?: InputMaybe<Array<UrlInput>>
}

export type Site = {
  __typename?: 'Site'
  created: Scalars['Time']['output']
  description?: Maybe<Scalars['String']['output']>
  icon: Scalars['String']['output']
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
  regex?: Maybe<Scalars['String']['output']>
  updated: Scalars['Time']['output']
  url?: Maybe<Scalars['String']['output']>
  valid_types: Array<ValidSiteTypeEnum>
}

export type SiteCreateInput = {
  description?: InputMaybe<Scalars['String']['input']>
  name: Scalars['String']['input']
  regex?: InputMaybe<Scalars['String']['input']>
  url?: InputMaybe<Scalars['String']['input']>
  valid_types: Array<ValidSiteTypeEnum>
}

export type SiteDestroyInput = {
  id: Scalars['ID']['input']
}

export type SiteUpdateInput = {
  description?: InputMaybe<Scalars['String']['input']>
  id: Scalars['ID']['input']
  name: Scalars['String']['input']
  regex?: InputMaybe<Scalars['String']['input']>
  url?: InputMaybe<Scalars['String']['input']>
  valid_types: Array<ValidSiteTypeEnum>
}

export enum SortDirectionEnum {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type StashBoxConfig = {
  __typename?: 'StashBoxConfig'
  edit_update_limit: Scalars['Int']['output']
  guidelines_url: Scalars['String']['output']
  host_url: Scalars['String']['output']
  min_destructive_voting_period: Scalars['Int']['output']
  require_activation: Scalars['Boolean']['output']
  require_invite: Scalars['Boolean']['output']
  require_scene_draft: Scalars['Boolean']['output']
  require_tag_role: Scalars['Boolean']['output']
  vote_application_threshold: Scalars['Int']['output']
  vote_cron_interval: Scalars['String']['output']
  vote_promotion_threshold?: Maybe<Scalars['Int']['output']>
  voting_period: Scalars['Int']['output']
}

export type StringCriterionInput = {
  modifier: CriterionModifier
  value: Scalars['String']['input']
}

export type Studio = {
  __typename?: 'Studio'
  aliases: Array<Scalars['String']['output']>
  child_studios: Array<Studio>
  created: Scalars['Time']['output']
  deleted: Scalars['Boolean']['output']
  id: Scalars['ID']['output']
  images: Array<Image>
  is_favorite: Scalars['Boolean']['output']
  name: Scalars['String']['output']
  parent?: Maybe<Studio>
  performers: QueryPerformersResultType
  updated: Scalars['Time']['output']
  urls: Array<Url>
}

export type StudioPerformersArgs = {
  input: PerformerQueryInput
}

export type StudioCreateInput = {
  aliases?: InputMaybe<Array<Scalars['String']['input']>>
  image_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  name: Scalars['String']['input']
  parent_id?: InputMaybe<Scalars['ID']['input']>
  urls?: InputMaybe<Array<UrlInput>>
}

export type StudioDestroyInput = {
  id: Scalars['ID']['input']
}

export type StudioEdit = {
  __typename?: 'StudioEdit'
  added_aliases?: Maybe<Array<Scalars['String']['output']>>
  added_images?: Maybe<Array<Maybe<Image>>>
  /** Added and modified URLs */
  added_urls?: Maybe<Array<Url>>
  images: Array<Image>
  name?: Maybe<Scalars['String']['output']>
  parent?: Maybe<Studio>
  removed_aliases?: Maybe<Array<Scalars['String']['output']>>
  removed_images?: Maybe<Array<Maybe<Image>>>
  removed_urls?: Maybe<Array<Url>>
  urls: Array<Url>
}

export type StudioEditDetailsInput = {
  aliases?: InputMaybe<Array<Scalars['String']['input']>>
  image_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  name?: InputMaybe<Scalars['String']['input']>
  parent_id?: InputMaybe<Scalars['ID']['input']>
  urls?: InputMaybe<Array<UrlInput>>
}

export type StudioEditInput = {
  /** Not required for destroy type */
  details?: InputMaybe<StudioEditDetailsInput>
  edit: EditInput
}

export type StudioQueryInput = {
  direction?: SortDirectionEnum
  has_parent?: InputMaybe<Scalars['Boolean']['input']>
  /** Filter by studio favorite status for the current user */
  is_favorite?: InputMaybe<Scalars['Boolean']['input']>
  /** Filter to search name - assumes like query unless quoted */
  name?: InputMaybe<Scalars['String']['input']>
  /** Filter to search studio name, aliases and parent studio name - assumes like query unless quoted */
  names?: InputMaybe<Scalars['String']['input']>
  page?: Scalars['Int']['input']
  parent?: InputMaybe<IdCriterionInput>
  per_page?: Scalars['Int']['input']
  sort?: StudioSortEnum
  /** Filter to search url - assumes like query unless quoted */
  url?: InputMaybe<Scalars['String']['input']>
}

export enum StudioSortEnum {
  CreatedAt = 'CREATED_AT',
  Name = 'NAME',
  UpdatedAt = 'UPDATED_AT'
}

export type StudioUpdateInput = {
  aliases?: InputMaybe<Array<Scalars['String']['input']>>
  id: Scalars['ID']['input']
  image_ids?: InputMaybe<Array<Scalars['ID']['input']>>
  name?: InputMaybe<Scalars['String']['input']>
  parent_id?: InputMaybe<Scalars['ID']['input']>
  urls?: InputMaybe<Array<UrlInput>>
}

export type Tag = {
  __typename?: 'Tag'
  aliases: Array<Scalars['String']['output']>
  category?: Maybe<TagCategory>
  created: Scalars['Time']['output']
  deleted: Scalars['Boolean']['output']
  description?: Maybe<Scalars['String']['output']>
  edits: Array<Edit>
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
  updated: Scalars['Time']['output']
}

export type TagCategory = {
  __typename?: 'TagCategory'
  description?: Maybe<Scalars['String']['output']>
  group: TagGroupEnum
  id: Scalars['ID']['output']
  name: Scalars['String']['output']
}

export type TagCategoryCreateInput = {
  description?: InputMaybe<Scalars['String']['input']>
  group: TagGroupEnum
  name: Scalars['String']['input']
}

export type TagCategoryDestroyInput = {
  id: Scalars['ID']['input']
}

export type TagCategoryUpdateInput = {
  description?: InputMaybe<Scalars['String']['input']>
  group?: InputMaybe<TagGroupEnum>
  id: Scalars['ID']['input']
  name?: InputMaybe<Scalars['String']['input']>
}

export type TagCreateInput = {
  aliases?: InputMaybe<Array<Scalars['String']['input']>>
  category_id?: InputMaybe<Scalars['ID']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  name: Scalars['String']['input']
}

export type TagDestroyInput = {
  id: Scalars['ID']['input']
}

export type TagEdit = {
  __typename?: 'TagEdit'
  added_aliases?: Maybe<Array<Scalars['String']['output']>>
  aliases: Array<Scalars['String']['output']>
  category?: Maybe<TagCategory>
  description?: Maybe<Scalars['String']['output']>
  name?: Maybe<Scalars['String']['output']>
  removed_aliases?: Maybe<Array<Scalars['String']['output']>>
}

export type TagEditDetailsInput = {
  aliases?: InputMaybe<Array<Scalars['String']['input']>>
  category_id?: InputMaybe<Scalars['ID']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  name?: InputMaybe<Scalars['String']['input']>
}

export type TagEditInput = {
  /** Not required for destroy type */
  details?: InputMaybe<TagEditDetailsInput>
  edit: EditInput
}

export enum TagGroupEnum {
  Action = 'ACTION',
  People = 'PEOPLE',
  Scene = 'SCENE'
}

export type TagQueryInput = {
  /** Filter to category ID */
  category_id?: InputMaybe<Scalars['ID']['input']>
  direction?: SortDirectionEnum
  /** Filter to search name - assumes like query unless quoted */
  name?: InputMaybe<Scalars['String']['input']>
  /** Searches name and aliases - assumes like query unless quoted */
  names?: InputMaybe<Scalars['String']['input']>
  page?: Scalars['Int']['input']
  per_page?: Scalars['Int']['input']
  sort?: TagSortEnum
  /** Filter to search name, aliases and description - assumes like query unless quoted */
  text?: InputMaybe<Scalars['String']['input']>
}

export enum TagSortEnum {
  CreatedAt = 'CREATED_AT',
  Name = 'NAME',
  UpdatedAt = 'UPDATED_AT'
}

export type TagUpdateInput = {
  aliases?: InputMaybe<Array<Scalars['String']['input']>>
  category_id?: InputMaybe<Scalars['ID']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  id: Scalars['ID']['input']
  name?: InputMaybe<Scalars['String']['input']>
}

export enum TargetTypeEnum {
  Performer = 'PERFORMER',
  Scene = 'SCENE',
  Studio = 'STUDIO',
  Tag = 'TAG'
}

export type Url = {
  __typename?: 'URL'
  site: Site
  /** @deprecated Use the site field instead */
  type: Scalars['String']['output']
  url: Scalars['String']['output']
}

export type UrlInput = {
  site_id: Scalars['ID']['input']
  url: Scalars['String']['input']
}

export type UpdatedEdit = {
  __typename?: 'UpdatedEdit'
  edit: Edit
}

export type User = {
  __typename?: 'User'
  /** @deprecated Use invite_codes instead */
  active_invite_codes?: Maybe<Array<Scalars['String']['output']>>
  /** Calls to the API from this user over a configurable time period */
  api_calls: Scalars['Int']['output']
  /** Should not be visible to other users */
  api_key?: Maybe<Scalars['String']['output']>
  /**  Edit counts by status  */
  edit_count: UserEditCount
  /** Should not be visible to other users */
  email?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  invite_codes?: Maybe<Array<InviteKey>>
  invite_tokens?: Maybe<Scalars['Int']['output']>
  invited_by?: Maybe<User>
  name: Scalars['String']['output']
  notification_subscriptions: Array<NotificationEnum>
  /** Should not be visible to other users */
  roles?: Maybe<Array<RoleEnum>>
  /**  Vote counts by type  */
  vote_count: UserVoteCount
}

export type UserChangeEmailInput = {
  existing_email_token?: InputMaybe<Scalars['ID']['input']>
  new_email?: InputMaybe<Scalars['String']['input']>
  new_email_token?: InputMaybe<Scalars['ID']['input']>
}

export enum UserChangeEmailStatus {
  ConfirmNew = 'CONFIRM_NEW',
  ConfirmOld = 'CONFIRM_OLD',
  Error = 'ERROR',
  Expired = 'EXPIRED',
  InvalidToken = 'INVALID_TOKEN',
  Success = 'SUCCESS'
}

export type UserChangePasswordInput = {
  /** Password in plain text */
  existing_password?: InputMaybe<Scalars['String']['input']>
  new_password: Scalars['String']['input']
  reset_key?: InputMaybe<Scalars['ID']['input']>
}

export type UserCreateInput = {
  email: Scalars['String']['input']
  invited_by_id?: InputMaybe<Scalars['ID']['input']>
  name: Scalars['String']['input']
  /** Password in plain text */
  password: Scalars['String']['input']
  roles: Array<RoleEnum>
}

export type UserDestroyInput = {
  id: Scalars['ID']['input']
}

export type UserEditCount = {
  __typename?: 'UserEditCount'
  accepted: Scalars['Int']['output']
  canceled: Scalars['Int']['output']
  failed: Scalars['Int']['output']
  immediate_accepted: Scalars['Int']['output']
  immediate_rejected: Scalars['Int']['output']
  pending: Scalars['Int']['output']
  rejected: Scalars['Int']['output']
}

export type UserQueryInput = {
  /** Filter by api key */
  apiKey?: InputMaybe<Scalars['String']['input']>
  /** Filter by number of API calls */
  api_calls?: InputMaybe<IntCriterionInput>
  /** Filter to search email - assumes like query unless quoted */
  email?: InputMaybe<Scalars['String']['input']>
  /** Filter by user that invited */
  invited_by?: InputMaybe<Scalars['ID']['input']>
  /** Filter to search user name - assumes like query unless quoted */
  name?: InputMaybe<Scalars['String']['input']>
  page?: Scalars['Int']['input']
  per_page?: Scalars['Int']['input']
  /** Filter by roles */
  roles?: InputMaybe<RoleCriterionInput>
  /** Filter by successful edits */
  successful_edits?: InputMaybe<IntCriterionInput>
  /** Filter by votes on successful edits */
  successful_votes?: InputMaybe<IntCriterionInput>
  /** Filter by unsuccessful edits */
  unsuccessful_edits?: InputMaybe<IntCriterionInput>
  /** Filter by votes on unsuccessful edits */
  unsuccessful_votes?: InputMaybe<IntCriterionInput>
}

export type UserUpdateInput = {
  email?: InputMaybe<Scalars['String']['input']>
  id: Scalars['ID']['input']
  name?: InputMaybe<Scalars['String']['input']>
  /** Password in plain text */
  password?: InputMaybe<Scalars['String']['input']>
  roles?: InputMaybe<Array<RoleEnum>>
}

export type UserVoteCount = {
  __typename?: 'UserVoteCount'
  abstain: Scalars['Int']['output']
  accept: Scalars['Int']['output']
  immediate_accept: Scalars['Int']['output']
  immediate_reject: Scalars['Int']['output']
  reject: Scalars['Int']['output']
}

export enum UserVotedFilterEnum {
  Abstain = 'ABSTAIN',
  Accept = 'ACCEPT',
  NotVoted = 'NOT_VOTED',
  Reject = 'REJECT'
}

export enum ValidSiteTypeEnum {
  Performer = 'PERFORMER',
  Scene = 'SCENE',
  Studio = 'STUDIO'
}

export type Version = {
  __typename?: 'Version'
  build_time: Scalars['String']['output']
  build_type: Scalars['String']['output']
  hash: Scalars['String']['output']
  version: Scalars['String']['output']
}

export enum VoteStatusEnum {
  Accepted = 'ACCEPTED',
  Canceled = 'CANCELED',
  Failed = 'FAILED',
  ImmediateAccepted = 'IMMEDIATE_ACCEPTED',
  ImmediateRejected = 'IMMEDIATE_REJECTED',
  Pending = 'PENDING',
  Rejected = 'REJECTED'
}

export enum VoteTypeEnum {
  Abstain = 'ABSTAIN',
  Accept = 'ACCEPT',
  /** Immediately accepts the edit - bypassing the vote */
  ImmediateAccept = 'IMMEDIATE_ACCEPT',
  /** Immediately rejects the edit - bypassing the vote */
  ImmediateReject = 'IMMEDIATE_REJECT',
  Reject = 'REJECT'
}

export type ImageFieldsFragment = { __typename?: 'Image'; id: string; url: string; width: number; height: number } & {
  ' $fragmentName'?: 'ImageFieldsFragment'
}

export type FingerprintFieldsFragment = {
  __typename?: 'Fingerprint'
  hash: string
  algorithm: FingerprintAlgorithm
  duration: number
} & { ' $fragmentName'?: 'FingerprintFieldsFragment' }

export type PerformerAppearanceFieldsFragment = {
  __typename?: 'PerformerAppearance'
  performer: { __typename?: 'Performer'; id: string; name: string; disambiguation?: string | null }
} & { ' $fragmentName'?: 'PerformerAppearanceFieldsFragment' }

export type SiteFieldsFragment = { __typename?: 'Site'; id: string; name: string; url?: string | null } & {
  ' $fragmentName'?: 'SiteFieldsFragment'
}

export type UrlFieldsFragment = {
  __typename?: 'URL'
  url: string
  site: { __typename?: 'Site' } & { ' $fragmentRefs'?: { SiteFieldsFragment: SiteFieldsFragment } }
} & { ' $fragmentName'?: 'UrlFieldsFragment' }

export type SceneFieldsFragment = {
  __typename?: 'Scene'
  id: string
  title?: string | null
  details?: string | null
  director?: string | null
  code?: string | null
  duration?: number | null
  releasedAt?: string | null
  images: Array<{ __typename?: 'Image' } & { ' $fragmentRefs'?: { ImageFieldsFragment: ImageFieldsFragment } }>
  fingerprints: Array<
    { __typename?: 'Fingerprint' } & { ' $fragmentRefs'?: { FingerprintFieldsFragment: FingerprintFieldsFragment } }
  >
  performers: Array<
    { __typename?: 'PerformerAppearance' } & {
      ' $fragmentRefs'?: { PerformerAppearanceFieldsFragment: PerformerAppearanceFieldsFragment }
    }
  >
  urls: Array<{ __typename?: 'URL' } & { ' $fragmentRefs'?: { UrlFieldsFragment: UrlFieldsFragment } }>
  studio?: {
    __typename?: 'Studio'
    id: string
    name: string
    aliases: Array<string>
    images: Array<{ __typename?: 'Image' } & { ' $fragmentRefs'?: { ImageFieldsFragment: ImageFieldsFragment } }>
  } | null
} & { ' $fragmentName'?: 'SceneFieldsFragment' }

export type FindSceneQueryVariables = Exact<{
  id: Scalars['ID']['input']
}>

export type FindSceneQuery = {
  __typename?: 'Query'
  findScene?: ({ __typename?: 'Scene' } & { ' $fragmentRefs'?: { SceneFieldsFragment: SceneFieldsFragment } }) | null
}

export type QueryScenesQueryVariables = Exact<{
  input: SceneQueryInput
}>

export type QueryScenesQuery = {
  __typename?: 'Query'
  queryScenes: {
    __typename?: 'QueryScenesResultType'
    count: number
    scenes: Array<{ __typename?: 'Scene' } & { ' $fragmentRefs'?: { SceneFieldsFragment: SceneFieldsFragment } }>
  }
}

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>
  private value: string
  public __meta__?: Record<string, any> | undefined

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value)
    this.value = value
    this.__meta__ = __meta__
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value
  }
}
export const ImageFieldsFragmentDoc = new TypedDocumentString(
  `
    fragment ImageFields on Image {
  id
  url
  width
  height
}
    `,
  { fragmentName: 'ImageFields' }
) as unknown as TypedDocumentString<ImageFieldsFragment, unknown>
export const FingerprintFieldsFragmentDoc = new TypedDocumentString(
  `
    fragment FingerprintFields on Fingerprint {
  hash
  algorithm
  duration
}
    `,
  { fragmentName: 'FingerprintFields' }
) as unknown as TypedDocumentString<FingerprintFieldsFragment, unknown>
export const PerformerAppearanceFieldsFragmentDoc = new TypedDocumentString(
  `
    fragment PerformerAppearanceFields on PerformerAppearance {
  performer {
    id
    name
    disambiguation
  }
}
    `,
  { fragmentName: 'PerformerAppearanceFields' }
) as unknown as TypedDocumentString<PerformerAppearanceFieldsFragment, unknown>
export const SiteFieldsFragmentDoc = new TypedDocumentString(
  `
    fragment SiteFields on Site {
  id
  name
  url
}
    `,
  { fragmentName: 'SiteFields' }
) as unknown as TypedDocumentString<SiteFieldsFragment, unknown>
export const UrlFieldsFragmentDoc = new TypedDocumentString(
  `
    fragment UrlFields on URL {
  url
  site {
    ...SiteFields
  }
}
    fragment SiteFields on Site {
  id
  name
  url
}`,
  { fragmentName: 'UrlFields' }
) as unknown as TypedDocumentString<UrlFieldsFragment, unknown>
export const SceneFieldsFragmentDoc = new TypedDocumentString(
  `
    fragment SceneFields on Scene {
  id
  title
  details
  director
  code
  releasedAt: release_date
  duration
  images {
    ...ImageFields
  }
  fingerprints {
    ...FingerprintFields
  }
  performers {
    ...PerformerAppearanceFields
  }
  urls {
    ...UrlFields
  }
  studio {
    id
    name
    images {
      ...ImageFields
    }
    aliases
  }
}
    fragment ImageFields on Image {
  id
  url
  width
  height
}
fragment FingerprintFields on Fingerprint {
  hash
  algorithm
  duration
}
fragment PerformerAppearanceFields on PerformerAppearance {
  performer {
    id
    name
    disambiguation
  }
}
fragment SiteFields on Site {
  id
  name
  url
}
fragment UrlFields on URL {
  url
  site {
    ...SiteFields
  }
}`,
  { fragmentName: 'SceneFields' }
) as unknown as TypedDocumentString<SceneFieldsFragment, unknown>
export const FindSceneDocument = new TypedDocumentString(`
    query FindScene($id: ID!) {
  findScene(id: $id) {
    ...SceneFields
  }
}
    fragment ImageFields on Image {
  id
  url
  width
  height
}
fragment FingerprintFields on Fingerprint {
  hash
  algorithm
  duration
}
fragment PerformerAppearanceFields on PerformerAppearance {
  performer {
    id
    name
    disambiguation
  }
}
fragment SiteFields on Site {
  id
  name
  url
}
fragment UrlFields on URL {
  url
  site {
    ...SiteFields
  }
}
fragment SceneFields on Scene {
  id
  title
  details
  director
  code
  releasedAt: release_date
  duration
  images {
    ...ImageFields
  }
  fingerprints {
    ...FingerprintFields
  }
  performers {
    ...PerformerAppearanceFields
  }
  urls {
    ...UrlFields
  }
  studio {
    id
    name
    images {
      ...ImageFields
    }
    aliases
  }
}`) as unknown as TypedDocumentString<FindSceneQuery, FindSceneQueryVariables>
export const QueryScenesDocument = new TypedDocumentString(`
    query QueryScenes($input: SceneQueryInput!) {
  queryScenes(input: $input) {
    count
    scenes {
      ...SceneFields
    }
  }
}
    fragment ImageFields on Image {
  id
  url
  width
  height
}
fragment FingerprintFields on Fingerprint {
  hash
  algorithm
  duration
}
fragment PerformerAppearanceFields on PerformerAppearance {
  performer {
    id
    name
    disambiguation
  }
}
fragment SiteFields on Site {
  id
  name
  url
}
fragment UrlFields on URL {
  url
  site {
    ...SiteFields
  }
}
fragment SceneFields on Scene {
  id
  title
  details
  director
  code
  releasedAt: release_date
  duration
  images {
    ...ImageFields
  }
  fingerprints {
    ...FingerprintFields
  }
  performers {
    ...PerformerAppearanceFields
  }
  urls {
    ...UrlFields
  }
  studio {
    id
    name
    images {
      ...ImageFields
    }
    aliases
  }
}`) as unknown as TypedDocumentString<QueryScenesQuery, QueryScenesQueryVariables>
