package tree_sitter_bend_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-bend"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_bend.Language())
	if language == nil {
		t.Errorf("Error loading Bend grammar")
	}
}
