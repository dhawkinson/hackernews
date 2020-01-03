// App.js
// the wrapper for the entire app
import React, { Component } from 'react'
import axios from 'axios'
import PropTypes from 'prop-types'
import LoadingIcon from './icons/icons8-loading-48.png'
import { sortBy } from 'lodash'
import classNames from 'classnames'

import './App.css';

const DEFAULT_QUERY = 'redux'
const DEFAULT_HPP = '100'
const PATH_BASE = 'https://hn.algolia.com/api/v1'
const PATH_SEARCH = '/search'
const PARAM_SEARCH = 'query='
const PARAM_PAGE = 'page='
const PARAM_HPP = 'hitsPerPage='

const lgCol = {
  width: '40%',
}

const mdCol = {
  width: '30%',
}

const smCol = {
  width: '10%',
}

const SORTS = {
  NONE: list => list,
  TITLE: list => sortBy(list, 'title'),
  AUTHOR: list => sortBy(list, 'author'),
  COMMENTS: list => sortBy(list, 'num_comments').reverse(),
  POINTS: list => sortBy(list, 'points').reverse(),
};

const updateSearchTopStoriesState = (hits, page) => (prevState) => {
  // set the cache key
  const { searchKey, results } = prevState
  // check for old hits -- when we have some pass the results by searchKey else an empty array
  const oldHits = results && results[searchKey] ? results[searchKey].hits : []
  // merge old hits with new hits
  const updatedHits = [ ...oldHits, ...hits ];

  // return the merged results (thus preserving prevState while merging in new state)
  return {
    results: { ...results, [searchKey]: { hits: updatedHits, page } },
    isLoading: false
  };
};

// begin App component
class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      results: null,
      searchKey: '',
      searchTerm: DEFAULT_QUERY,
      error: null,
      isLoading: false,
    }
    // set bindings here, in the constructor, rather than when used (as in the form below)
    // because if done below the bind happens each time the instance fires
    // when bound here it is bound once and available for each instance
    this.setSearchTopStories = this.setSearchTopStories.bind(this)
    this.fetchSearchTopStories = this.fetchSearchTopStories.bind(this)
    this.onDismiss = this.onDismiss.bind(this)
    this.onSearchSubmit = this.onSearchSubmit.bind(this)
    this.onSearchChange = this.onSearchChange.bind(this)
    this.needsToSearchTopStories = this.needsToSearchTopStories.bind(this)
  }

  needsToSearchTopStories(searchTerm) {
    // return boolean
    // true = no results found in state for the searchTerm
    // false = some results found in state for the searchTerm (no need to search again)
    return !this.state.results[searchTerm];
  }

  setSearchTopStories(result) {
    // get the hits and page from the result (new state)
    const { hits, page } = result
    this.setState(updateSearchTopStoriesState( hits, page ))
  }

  fetchSearchTopStories(searchTerm, page = 0) {

this.setState({ isLoading: true })

    const url = `${PATH_BASE}${PATH_SEARCH}?${PARAM_SEARCH}${searchTerm}&${PARAM_PAGE}${page}&${PARAM_HPP}${DEFAULT_HPP}`

    axios.get(url)
      .then(result => this.setSearchTopStories(result.data))
      .catch(error => this.setState( { error } )) //  update state with the error
  }

  componentDidMount() {
    const { searchTerm } = this.state
    this.setState({ searchKey: searchTerm })
    this.fetchSearchTopStories(searchTerm)
    // const url = `${PATH_BASE}${PATH_SEARCH}?${PARAM_SEARCH}${searchTerm}&${PARAM_PAGE}&${PARAM_HPP}${DEFAULT_HPP}`

    // fetch(url)
    //   .then(response => response.json())
    //   .then(result => this.setSearchTopStories(result))
    //   .catch(error => error)
  }

  onSearchChange(event) {
    this.setState({ searchTerm: event.target.value })
  }

  onSearchSubmit(event) {
    const { searchTerm } = this.state
    this.setState({ searchKey: searchTerm })
    // if needsToSearchTopStories is true - fetch results
    if (this.needsToSearchTopStories(searchTerm)) {
      this.fetchSearchTopStories(searchTerm)
    }

    event.preventDefault()
  }

  onDismiss(id) {
    // set the searchKey and results from this.state
    const { searchKey, results } = this.state
    // set the hits and page from the results at the searchKey position
    const { hits, page } = results[searchKey]
    // test to make sure the id for the mapped item !== the id dismissed
    const isNotId = item => item.objectID !== id //  could flatten out the isNotId but didn't for readability
    // when !== to the dismissed id, place the hits into the updatedHits array
    const updatedHits = hits.filter(isNotId)
    // update the results (eliminating the dismissed item)
    this.setState({ 
      results: { 
        ...results, 
        [searchKey]: { hits: updatedHits, page } 
      }
    })
  }

  render() {
    // parse current state for searchTerm, results, searchKey, error, isLoading, sortKey
    const { 
      searchTerm, 
      results, 
      searchKey, 
      error, 
      isLoading,
    } = this.state
    // set page from the searchKey results page or 0 (when no results)
    const page = ( results && results[searchKey] && results[searchKey].page  ) || 0
    // build list from returned results or null array (when no results)
    const list = ( results && results[searchKey] && results[searchKey].hits ) || []

    return ( 
      <div className = 'page' >
        <div className = 'interactions' >
          {/* set the search value and search for results */}
          <Search 
            value = { searchTerm }
            onChange = { this.onSearchChange }
            onSubmit = { this.onSearchSubmit }
          >
          Search
          </Search>
        </div>
        { error
          ? 
          <div className='interactions'>
            <p>Something went wrong fetching results!</p>
          </div>
          : 
          <Table 
            list = { list } 
            onDismiss = { this.onDismiss } 
          />
        }
        {/* paginate results at page bottom */}
        <div className='interactions'>
          <ButtonWithLoading isLoading={ isLoading } onClick={() => this.fetchSearchTopStories(searchKey, page + 1)}>More</ButtonWithLoading>
        </div>
      </div>
    )
  }
}
// end App component

// begin Search component
const Search = ({
  value,
  onChange,
  onSubmit,
  children
}) =>
  <form onSubmit={onSubmit}>
    <input
      type="text"
      value={value}
      onChange={onChange}
    />
    <button type="submit">
      {children}
    </button>
  </form>
// end Search component

// begin Table component
class Table extends Component {
  constructor(props) {
    super(props)

    this.state = {
      sortKey: 'NONE',
      isSortReverse: false,
    };

    this.onSort = this.onSort.bind(this)
  }

  onSort(sortKey) {
    // set state sortKey and toggle boolean isSortReverse
    // sortKey always gets set
    // isSortReverse is toggled when the sortKey matches && sSortReverse doesn't match
    const isSortReverse = this.state.sortKey === sortKey &&
      !this.state.isSortReverse;

    this.setState({ sortKey, isSortReverse });
  }

  render() {
    const {
      list,
      onDismiss 
    } = this.props

    const {
      sortKey,
      isSortReverse,
    } = this.state

    const sortedList = SORTS[sortKey](list)
    const reverseSortedList = isSortReverse
      ? sortedList.reverse()
      : sortedList

    return (
      <div className="table">
        <div className="table-header">
          <span style={lgCol}>
            <Sort
              sortKey={'TITLE'}
              onSort={this.onSort}
              activeSortKey={sortKey}
            >
              Title
            </Sort>
          </span>
          <span style={mdCol}>
            <Sort
              sortKey={'AUTHOR'}
              onSort={this.onSort}
              activeSortKey={sortKey}
            >
              Author
            </Sort>
          </span>
          <span style={smCol}>
            <Sort
              sortKey={'COMMENTS'}
              onSort={this.onSort}
              activeSortKey={sortKey}
            >
              Comments
            </Sort>
          </span>
          <span style={smCol}>
            <Sort
              sortKey={'POINTS'}
              onSort={this.onSort}
              activeSortKey={sortKey}
            >
              Points
            </Sort>
          </span>
          <span style={smCol}>
            Archive
          </span>
        </div>
        {reverseSortedList.map(item =>
          <div key={item.objectID} className="table-row">
            <span style={lgCol}>
              <a href={item.url}>{item.title}</a>
            </span>
            <span style={mdCol}>
              {item.author}
            </span>
            <span style={smCol}>
              {item.num_comments}
            </span>
            <span style={smCol}>
              {item.points}
            </span>
            <span style={smCol}>
              <Button
                onClick={() => onDismiss(item.objectID)}
                className="button-inline"
              >
                Dismiss
              </Button>
            </span>
          </div>
        )}
      </div>
    );
  }
}

// enforce data typing on Table
Table.propTypes = {
  list: PropTypes.arrayOf(
    PropTypes.shape({
      // objectID has function & is required
      objectID: PropTypes.string.isRequired,
      // all the rest are display-only & are not required (and data is not required to be complete in the API)
      author: PropTypes.string,
      url: PropTypes.string,
      num_comments: PropTypes.number,
      points: PropTypes.number,
    })
  ).isRequired,
  onDismiss: PropTypes.func.isRequired
}
// end Table component

// begin Sort component
const Sort = ({
  sortKey,
  activeSortKey,
  onSort,
  children
}) => {
  const sortClass = classNames(
    'button-inline',
    { 'button-active': sortKey === activeSortKey }
  );

  return (
    <Button
      onClick={() => onSort(sortKey)}
      className={sortClass}
    >
      {children}
    </Button>
  );
}
// end Sort component

// begin Button component
const Button = ({ onClick, className, children}) => 
  <button 
    onClick = { onClick }
    className = { className }
    type = "button" >
    {
      children
    } 
  </button>

  // enforce data typing on Button
  Button.propTypes = {
    onClick: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired
  }
  Button.defaultProps = {
    className: '',
  }
// end Button component

// display a Loading indicator
const Loading = () =>
<div><img src={LoadingIcon} alt='loading' /></div>

const withLoading = (Component) => ({ isLoading, ...rest }) =>
isLoading
  ? <Loading />
  : <Component { ...rest } />

const ButtonWithLoading = withLoading(Button);

export default App

export {
  Button,
  Search,
  Table,
}